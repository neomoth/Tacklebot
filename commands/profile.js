const{EmbedBuilder, Message}=require('discord.js');
const{primaryColor}=require('../config.json');
module.exports = {
	data:{
		name:'profile',
		description:'Displays your profile.',
		usage:`]profile`,
		aliases:['p'],
		restrict:true,
	},
	async execute(i){
		let sql = i.client.sql;
		await sql.promise(sql.addUser, i.author.id);
		let money = await i.client.sql.promise(i.client.sql.getMoney, i.author.id)
		let embed = new EmbedBuilder()
			.setColor(primaryColor)
			.setTitle(`${i.author.username}'s Profile`)
			.addFields(
				{name:'Money',value:`$${money.money}`},
			)
			.setThumbnail(i.author.displayAvatarURL())
		await i.reply({embeds:[embed]});
	}
}