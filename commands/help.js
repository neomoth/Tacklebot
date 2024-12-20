const{globalPrefix,primaryColor,specialColor,confirmColor,errorColor,lockCommands}=require('../config.json');
const{ButtonBuilder,EmbedBuilder,ButtonStyle, PermissionsBitField}=require('discord.js');
const{Pagination}=require('pagination.djs');
module.exports = {
	data:{
		name:'help',
		description:'Lets you view the command list you\'re currently looking at.',
		usage:`${globalPrefix}help [command]`,
		aliases:['h'],
		restrict:true
	},async execute(i,args){
		let names=[]; //array
		let descriptions=[]; //array
		let usages=[]; //array
		let restricts=[]; //array
		let aliases=[]; //array of arrays
		let mods = []; // array
		let guildId = []; //array
		let isMod = i.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || i.author.id==1134602054288015380;
		if(!args[1]){
			const pagination = new Pagination(i);
			for(let [index,cmd] of i.client.commands){
				names.push(cmd.data.name);
				descriptions.push(cmd.data.description);
				usages.push(cmd.data.usage);
				if(cmd.data.mod)mods.push(cmd.data.mod);else mods.push(false);
				if(cmd.data.restrict)restricts.push(cmd.data.restrict);else restricts.push(false);
				if(cmd.data.aliases.length>0)aliases.push(cmd.data.aliases);else aliases.push(['[No aliases]']);
				if(cmd.data.associatedGuild)guildId.push(cmd.data.associatedGuild);else guildId.push(null);
			}
			pagination.setColor(isMod ? specialColor : primaryColor);
			pagination.setTitle('Command List');
			pagination.setDescription(`Type \`${globalPrefix}help command\` for more info, e.g. \`${globalPrefix}help ping\``);
			let fields=[];
			for(let n = 0;n<names.length;n++){
				if(mods[n]&&!isMod) continue;
				if(guildId[n]&&guildId[n]!=i.guildId)continue;
				fields.push({
					name:names[n],
					value:descriptions[n]
				});
			}
			pagination.setFields(fields);
			pagination.paginateFields();
			await pagination.render();
			return;
		}
		let cmd;
		for(let [index,c] of i.client.commands){
			if(args[1]===index) {cmd=c;break;}
		}
		if(!cmd) return await i.reply({embeds:[new EmbedBuilder()
				.setColor(errorColor)
				.setDescription('That isn\'t a valid command. Run this command without any arguments for a list of commands.')]});
		let embed = new EmbedBuilder()
			.setColor(primaryColor)
			.setTitle(cmd.data.name)
			.setDescription(cmd.data.description)
			.setFields(
				{name:'Usage',value:`\`${cmd.data.usage}\``},
				{name:'Aliases',value:`\`${cmd.data.aliases.length>0 ? cmd.data.aliases : '[No aliases.]'}\``},
				{name:'Restricted',value:`\`${cmd.data.restrict && lockCommands ? cmd.data.restrict : 'false'}\``}
			);
		i.reply({embeds:[embed]});
	}
}