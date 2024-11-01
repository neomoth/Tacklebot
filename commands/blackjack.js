const { ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("@discordjs/builders");
const { ActionRowBuilder } = require("@discordjs/builders");
const { ActionRow, ButtonStyle } = require("discord.js");
const {primaryColor, errorColor, confirmColor} = require('../config.json');

let ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
let suits = ['♠', '♥', '♦', '♣'];

function getEmojiRank(rank) {
    const emojiMap = {
        '2': '2️⃣',
        '3': '3️⃣',
        '4': '4️⃣',
        '5': '5️⃣',
        '6': '6️⃣',
        '7': '7️⃣',
        '8': '8️⃣',
        '9': '9️⃣',
        '10': '🔟',
        'J': '🇯',
        'Q': '🇶',
        'K': '🇰',
        'A': '🇦'
    };
    return emojiMap[rank] || rank;
}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function genDeck() {
	let deck = [];
	for(let suit of suits) {
		for(let rank of ranks) {
			deck.push({rank: rank, suit: suit});
		}
	}
	return shuffle(deck);
}

const games = new Map();

module.exports = {
	data:{
		name: 'blackjack',
		description: 'GAMBLING WOOOOOOOOO',
		aliases: ['bj'],
		usage: ']blackjack $bet',
		restrict:true,
	},
	async execute(i, args) {
		await i.client.sql.promise(i.client.sql.addUser, i.author.id);
		const {money} = await i.client.sql.promise(i.client.sql.getMoney, i.author.id);
		if(!args[1]){
			return await i.reply('You must provide an amount to bet.');
		}
		if(args[1].startsWith('$')){
			args[1] = args[1].substring(1);
		}
		let bet;
		if(args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'max'){
			bet = money;
		}
		else bet = Math.floor(parseInt(args[1]));
		if(isNaN(bet)){
			return await i.reply('You must provide a valid amount to bet.');
		}
		if(bet <= 0){
			return await i.reply('You cannot bet below $1');
		}
		if(bet > 100000){
			return await i.reply('You cannot bet more than $100,000.');
		}
		if(money < bet){
			return await i.reply(`You don't have enough money to bet. Current balance: $${money}`);
		}
		await i.client.sql.promise(i.client.sql.delMoney, i.author.id, bet);
		const deck = genDeck();
		const playerHand = [deck.pop(), deck.pop()];
		const dealerHand = [deck.pop(), deck.pop()];

		const game = {
			deck,
			playerHand,
			dealerHand,
			status: 'playing',
			message: null,
			bet: bet,
			i: i
		};

		if (calculateHandValue(game.playerHand) > 21) game.status = 'bust';
		else if (calculateHandValue(game.playerHand) === 21) {
			game.status = 'blackjack';
			i.client.sql.promise(i.client.sql.addMoney, i.author.id, game.bet*2);
		}
		else if (calculateHandValue(game.dealerHand) === 21) game.status = 'lose';
		else if (calculateHandValue(game.dealerHand) === 21 && calculateHandValue(game.playerHand) === 21) {
			game.status = 'tie';
			i.client.sql.promise(i.client.sql.addMoney, i.author.id, game.bet);
		}

		for (let g of games.keys()){
			if(g === i.author.id){
				let previousGame = games.get(g);
				previousGame.status = 'forfeit';
				await previousGame.message.edit({embeds: [renderGame(previousGame)], content: 'New game started, this game was forfeited.', components: []});
				games.delete(g);
				break;
			}
		}
		games.set(i.author.id, game);
		await sendGameMessage(i, game, i.author.id);
	}
}

async function sendGameMessage(message, game, playerId) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('hit')
				.setLabel('Hit')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(game.status!=='playing'),
			new ButtonBuilder()
				.setCustomId('stand')
				.setLabel('Stand')
				.setStyle(ButtonStyle.Danger)
				.setDisabled(game.status!=='playing'),
			// new ButtonBuilder()
			// 	.setCustomId('double')
			// 	.setLabel('Double')
			// 	.setStyle('SUCCESS')
			// 	.setDisabled(game.playerHand.length>2),
		);
	const gameMessage = await message.reply({
		embeds: [renderGame(game)],
		components: [row],
	});
	game.message = gameMessage;

	const filter = i => i.user.id === playerId;
	const collector = gameMessage.createMessageComponentCollector({ filter, time: 120000 });
	collector.on('collect', async interaction=>{
		if (interaction.customId === 'hit') {
			game.playerHand.push(game.deck.pop());
			if(calculateHandValue(game.playerHand) > 21) game.status = 'bust';
			else if (calculateHandValue(game.playerHand) === 21) {
				game.status = 'blackjack';
				game.i.client.sql.promise(game.i.client.sql.addMoney, game.i.author.id, game.bet*2);
			}
		} else if (interaction.customId === 'stand') {
			game.status = 'stand';
			playDealer(game);
		}// } else if (interaction.customId === 'double') {
		// 	game.playerHand.push(game.deck.pop())
		// }

		const newRow = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('hit')
				.setLabel('Hit')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(game.status!=='playing'),
			new ButtonBuilder()
				.setCustomId('stand')
				.setLabel('Stand')
				.setStyle(ButtonStyle.Danger)
				.setDisabled(game.status!=='playing'),
		);

		await interaction.update({embeds: [renderGame(game)], components: [newRow]});
		if (game.status !== 'playing') {
			collector.stop();
			games.delete(playerId);
		}
	});
	
	collector.on('end', async (collected, reason) => {
		if (game.status === 'playing') {
			game.status = 'forfeit';
			// edit message
			games.delete(playerId);
		}
	});
}

function getEmbedColor(game){
	switch (game.status){
		case 'playing': return 0xc4235e
		case 'win': return 0x00ff00
		case 'blackjack': return 0x00ff00
		case 'bust': return 0xff0000
		case 'lose': return 0xff0000
		case 'tie': return 0x00ffff
	}
	return 0xc4235e;
}

function renderGame(game) {
	let dealerValue = game.status==='playing' ? `${renderHand([game.dealerHand[0], {rank: '❔', suit:'❔'}])} (value: ${calculateHandValue([game.dealerHand[0]])})` : `${renderHand(game.dealerHand)} (value: ${calculateHandValue(game.dealerHand)})`
	return new EmbedBuilder()
		.setColor(getEmbedColor(game))
		.setTitle('Blackjack')
		.setDescription(`Game Status: ${game.status}`)
		.setFields([
			{name:'Dealer', value:dealerValue},
			{name:'Your Hand', value:`${renderHand(game.playerHand)} (value: ${calculateHandValue(game.playerHand)})`},
		]);
}

function renderHand(hand, showCount = hand.length){
	return hand.slice(0, showCount).map(card=>`${getEmojiRank(card.rank)}${card.suit}`).join(', ');
}

function calculateHandValue(hand) {
	let value = 0;
	let aceCount = 0;
	for (const card of hand) {
		if (card.rank === 'A'){
			value+=11;
			aceCount++;
		}else if (['K', 'Q', 'J'].includes(card.rank)){
			value+=10;
		}
		else{
			value+=parseInt(card.rank);
		}
	}
	while (value > 21 && aceCount > 0){
		value-=10;
		aceCount--;
	}
	return value;
}

function playDealer(game) {
	while (calculateHandValue(game.dealerHand) < 17) {
		game.dealerHand.push(game.deck.pop());
	}
	const playerValue = calculateHandValue(game.playerHand);
	const dealerValue = calculateHandValue(game.dealerHand);
	if (playerValue > dealerValue || dealerValue > 21) {
		game.status = 'win';
		game.i.client.sql.promise(game.i.client.sql.addMoney, game.i.author.id, Math.floor(game.bet*1.5));
	} else if (playerValue === dealerValue) {
		game.status = 'tie';
		game.i.client.sql.promise(game.i.client.sql.addMoney, game.i.author.id, game.bet*1);
	} else {
		game.status = 'lose';
	}
}