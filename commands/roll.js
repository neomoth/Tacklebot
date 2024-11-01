const {EmbedBuilder} = require("discord.js");
const{globalPrefix,primaryColor,errorColor}=require('../config.json');
module.exports = {
	data:{
		name:'roll',
		description:'Roll a a die with the amount of sides being whatever the first argument is.',
		usage:`${globalPrefix}roll d<number>`,
		aliases:['r'],
		restrict:true
	},async execute(i, args){
		if(!args[1]) return await i.reply({embeds:[new EmbedBuilder().setColor(errorColor).setDescription('You need to specify the amount of sides for the die. Usage: `]roll <number>`')]});
		if(args[1].startsWith('d')) {
			args[1] = args[1].slice('1');
			if (isNaN(args[1])) return await i.reply({embeds: [new EmbedBuilder().setColor(0xc42348).setDescription('You need to specify a number!')]});
			if(args[1]<1) return await i.reply({embeds: [new EmbedBuilder().setColor(errorColor).setDescription('no.')]});
			let result = Math.floor(Math.random() * args[1])+1;
			return await i.reply({embeds: [new EmbedBuilder().setColor(primaryColor).setDescription(`You rolled a ${result}!`)]});
		}
		if (isNaN(args[1])) return await i.reply({embeds: [new EmbedBuilder().setColor(0xc42348).setDescription('You need to specify a number!')]});
		if(args[1]<1) return await i.reply({embeds: [new EmbedBuilder().setColor(errorColor).setDescription('no.')]});
		await i.reply({embeds: [new EmbedBuilder().setColor(primaryColor).setDescription(`You rolled a ${args[1]}!`)]});
	}
}