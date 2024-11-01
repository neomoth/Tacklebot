const {EmbedBuilder} = require("discord.js");
const{globalPrefix,primaryColor,errorColor}=require('../config.json');
module.exports = {
	data:{
		name:'coinflip',
		description:'Flip a coin',
		usage:`${globalPrefix}roll <number>`,
		aliases:['flip','cf','coin'],
		restrict:true
	},async execute(i, args){
		await i.reply({embeds: [new EmbedBuilder().setColor(primaryColor).setDescription(`Landed on ${Math.floor(Math.random()*2) ? 'Heads' : 'Tails'}!`)]})
	}
}