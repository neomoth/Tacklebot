const{Client, Events, Collection, PermissionFlagsBits, GatewayIntentBits, PermissionsBitField, Partials, EmbedBuilder, MessageType, Message, VoiceState, GuildMember, GuildBan}=require('discord.js');
const{token,globalPrefix,lockCommands,commandChannels, primaryColor, confirmColor, errorColor, specialColor, altColor}=require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const SQL = require('./sql');

const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildMembers],
	partials:[Partials.Message, Partials.Channel, Partials.Reaction]});
client.commands = new Collection();
//client.slashCommands = new Collection();
client.storedData=new Collection();
// Allow commands to be reloaded without having to take bot offline.
client.reloadCommands=function(){
	client.commands.clear();
	const commandsPath = path.join(__dirname, 'commands');
	const commands = fs.readdirSync(commandsPath);
	for(const file of commands){
		const commandPath = path.join(commandsPath, file);
		const command = require(commandPath);
		if('data' in command && 'execute' in command){
			console.info(`[INFO]: Command [${command.data.name}] was loaded.`);
			client.commands.set(command.data.name, command);
		}else{
			console.warn(`[WARNING]: Command [${command}] lacks 'data' or 'execute' property.`);
		}
	}
}
// client.reloadSlashCommands=function(){
// 	const commandsPath = path.join(__dirname, 'slashcommands');
// 	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
// 	for (const file of commandFiles) {
// 		const filePath = path.join(commandsPath, file);
// 		const command = require(filePath);
// 		// Set a new item in the Collection with the key as the command name and the value as the exported module
// 		if ('data' in command && 'execute' in command) {
// 			console.info(`[INFO]: Slash Command [${command.data.name}] was loaded.`);
// 			client.slashCommands.set(command.data.name, command);
// 		} else {
// 			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
// 		}
// 	}
// }
client.globalPrefix = globalPrefix;
client.sql=SQL;
function parseISOString(s) {
	let b = s.split(/\D+/);
	return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
}
function findKeyByValue(value){
	for (const perm of Object.keys(PermissionsBitField.Flags)){
		if(PermissionsBitField.Flags[perm]===value){
			return perm;
		}
	}
	return "unknown";
}
function findKeysByValue(values){
	const result = [];

	for (const perm of Object.keys(PermissionsBitField.Flags)) {
		if (values.has(PermissionsBitField.Flags[perm])) {
			result.push(perm);
		}
	}
	return result;
}

// Interaction related events
client.on(Events.InteractionCreate, async interaction=>{
	if(!interaction.isChatInputCommand())return;

	const command = client.slashCommands.get(interaction.commandName);
	if(!command){
		console.error('cmd not found');
		return;
	}
	try{
		await command.execute(interaction);
	}catch(e){
		console.error(e);
		if(interaction.replied||interaction.deferred) await interaction.followUp({content:'There was an error while executing this command!',ephemeral:true});
		else await interaction.reply({content:'There was an error while executing this command!',ephemeral:true});
	}
});

// Message related events
client.on(Events.MessageCreate, async (e)=>{
	if(e.author.bot) return; // ignore bots/self

	// Command Handler
	if(!e.content.startsWith(globalPrefix)) return;
	let message = e.content.substring(1);
	let args = message.split(' ');
	let command = args[0];
	let cmd = client.commands.get(command);
	if(!cmd) {
		let realCmd;
		client.commands.forEach(c=>{
			for(const alias of c.data.aliases){
				if(command===alias) {
					realCmd = c;
					break;
				}
			}
		});
		if(!realCmd){
			if(!commandChannels.includes(e.channelId)) return;
			return await e.reply({content:`That's not a valid command. Please seek \`${globalPrefix}help\`.`}).then((m)=>{setTimeout(async()=>{
				await m.delete();
			},7000)});
		}
		cmd = client.commands.get(realCmd.data.name);
	}
	try{
		if(cmd.data.permissions){
			let p = [];
			for(let i = 0; i<cmd.data.permissions.length;i++){
				if(!e.member.permissions.has(cmd.data.permissions[i], false)){
					p.push(findKeyByValue(cmd.data.permissions[i]).toString());
				}
			}
			if(p.length>0){
				let str='';
				for(let i=0;i<p.length;i++){
					str+=p[i]+', ';
				}
				str=str.substring(0, str.length-2);
				if(!commandChannels.includes(e.channelId)) return;
				return await e.reply({content:`You don't have the required permissions to execute this command. Missing permissions: \`${str}\``}).then((m)=>{setTimeout(async()=>{
					await m.delete();
				},7000)});
				await e.reply({content:`You don't have the required permissions to execute this command. Missing permissions: \`${str}\``});
				return;
			}
		}
		if(lockCommands){
			if(cmd.data.restrict) {
				if(!commandChannels.includes(e.channelId)&&e.author.id!=1134602054288015380&&!e.member.permissions.has(PermissionsBitField.Flags.ManageMessages,false))return;
			}
		}
		if(cmd.data.disabled&&e.author.id!=1134602054288015380) return await e.reply(`Sorry, the ${cmd.data.name} command is disabled.`);
		await cmd.execute(e,args);
	} catch(err){
		err.stack = err.stack.replaceAll(__dirname, '')
		console.error(err.toString());
		console.error(err.stack);
		let embed = new EmbedBuilder().setColor(errorColor).setTitle(err.toString()).setDescription(err.stack.substring(0, 400)+'...');
		await e.reply({embeds:[embed]});
	}
});

let logChannel;

async function safetyCheck(obj){
	if(!obj) return false;
	if(obj.constructor==Message){
		if(obj.author===null||obj.author.bot) return false;
		await obj.guild.channels.fetch();
	}
	if(obj.constructor==VoiceState||obj.constructor==GuildMember||obj.constructor==GuildBan){
		await obj.guild.channels.fetch();
	}
	logChannel = await client.channels.cache.get('1295674139461288027');
	if(!logChannel) return false;
	return true;
}

client.on(Events.ClientReady,async()=>{
	console.info('[INFO]: Tacklebot is online.');
});


client.on(Events.MessageDelete, async (message) => {
	if (!await safetyCheck(message)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(errorColor);
	logEmbed.setTitle(`Message deleted in #${message.channel.name}`);
	logEmbed.setAuthor({name:message.author.tag,iconURL:message.author.displayAvatarURL()});
	logEmbed.setDescription(`${message.content}\n\nMessage ID: ${message.id}`);
	if(message.attachments.size>0){
		logEmbed.setThumbnail(message.attachments.first().url);
	}
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${message.author.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
	if (!await safetyCheck(newMessage)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(altColor);
	logEmbed.setTitle(`Message edted in #${oldMessage.channel.name}`);
	logEmbed.setAuthor({name:newMessage.author.tag,iconURL:newMessage.author.displayAvatarURL()});
	logEmbed.setDescription(`Old message: ${oldMessage.content}\nNew message: ${newMessage.content}\n\nMessage ID: ${newMessage.id}\n[Jump to message](${newMessage.url})`);
	if(newMessage.attachments.size>0){
		logEmbed.setThumbnail(newMessage.attachments.first().url);
	}
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${newMessage.author.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.GuildMemberAdd, async (member) => {
	if (!await safetyCheck(member)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(confirmColor);
	logEmbed.setTitle('Member joined');
	logEmbed.setAuthor({name:member.user.tag,iconURL:member.user.displayAvatarURL()});
	let count = member.guild.memberCount;
	let suffix = '';
	switch(count%10){
		case 1: suffix='st'; break;
		case 2: suffix='nd'; break;
		case 3: suffix='rd'; break;
		default: suffix='th';
	};
	logEmbed.setDescription(`<@${member.user.id}> - ${count}${suffix} member to join.\nJoined on ${member.joinedAt}\nMember created at ${member.user.createdAt}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${member.user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.GuildMemberRemove, async (member) => {
	// if (!await safetyCheck(member)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(errorColor);
	logEmbed.setTitle('Member left');
	logEmbed.setAuthor({name:member.user.tag,iconURL:member.user.displayAvatarURL()});
	logEmbed.setDescription(`<@${member.user.id}> - Originally Joined on ${member.joinedAt}\n**Roles:** ${member.roles.cache.map(r=>r.name).join(', ')}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${member.user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
	if (!await safetyCheck(newMember)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(altColor);
	if(oldMember.nickname!=newMember.nickname){
		if(oldMember.nickname==null) oldMember.nickname='(None)';
		if(newMember.nickname==null) newMember.nickname='(None)';
		logEmbed.setTitle('Nickname changed');
		logEmbed.setAuthor({name:oldMember.user.tag,iconURL:oldMember.user.displayAvatarURL()});
		logEmbed.setDescription(`Old nickname: ${oldMember.nickname}\nNew nickname: ${newMember.nickname}`);
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${oldMember.user.id}`});
		await logChannel.send({embeds:[logEmbed]});
	}
	if(oldMember.roles.cache.size!=newMember.roles.cache.size){
		logEmbed.setTitle('Roles changed');
		logEmbed.setAuthor({name:oldMember.user.tag,iconURL:oldMember.user.displayAvatarURL()});
		let excludedRoles = ['1295625879535226922', '1296298827384360980'];
		let newRoles = newMember.roles.cache.filter(r=>!oldMember.roles.cache.has(r.id) && !excludedRoles.includes(r.id));
		let oldRoles = oldMember.roles.cache.filter(r=>!newMember.roles.cache.has(r.id) && !excludedRoles.includes(r.id));
		if(newRoles.size>0) logEmbed.setDescription(`Roles added: ${newRoles.map(r=>`<@&${r.id}>`).join(', ')}`);
		else if (oldRoles.size>0) logEmbed.setDescription(`Roles removed: ${oldRoles.map(r=>`<@&${r.id}>`).join(', ')}`);
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${oldMember.user.id}`});
		if(newRoles.size>0 || oldRoles.size>0) await logChannel.send({embeds:[logEmbed]});
	}
	if(oldMember.avatar!=newMember.avatar){
		logEmbed.setTitle('Avatar updated.');
		logEmbed.setAuthor({name:newMember.user.tag,iconURL:newMember.user.displayAvatarURL()});
		logEmbed.setThumbnail(newMember.user.displayAvatarURL());
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${newMember.user.id}`});
		await logChannel.send({embeds:[logEmbed]});
	}
});

client.on(Events.VoiceStateUpdate, async (oldState, newState)=>{
	if (!await safetyCheck(newState)) return;
	let logEmbed = new EmbedBuilder();
	if(!oldState.channel && newState.channel){
		logEmbed.setColor(confirmColor);
		logEmbed.setTitle('User connected to a voice channel');
		logEmbed.setAuthor({name:newState.member.user.tag,iconURL:newState.member.user.displayAvatarURL()});
		logEmbed.setDescription(`<@${newState.member.user.id}> connected to <#${newState.channel.id}>`);
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${newState.member.user.id}`});
		await logChannel.send({embeds:[logEmbed]});
	}
	else if(oldState.channel && !newState.channel){
		logEmbed.setColor(errorColor);
		logEmbed.setTitle('User disconnected from a voice channel');
		logEmbed.setAuthor({name:oldState.member.user.tag,iconURL:oldState.member.user.displayAvatarURL()});
		logEmbed.setDescription(`<@${oldState.member.user.id}> disconnected from <#${oldState.channel.id}>`);
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${oldState.member.user.id}`});
		await logChannel.send({embeds:[logEmbed]});
	}
	else if(oldState.channel !== newState.channel){
		logEmbed.setColor(altColor);
		logEmbed.setTitle('User moved between voice channels');
		logEmbed.setAuthor({name:newState.member.user.tag,iconURL:newState.member.user.displayAvatarURL()});
		logEmbed.setDescription(`<@${newState.member.user.id}> moved between <#${oldState.channel.id}> and <#${newState.channel.id}>`);
		logEmbed.setTimestamp(Date.now());
		logEmbed.setFooter({text:`User ID: ${newState.member.user.id}`});
		await logChannel.send({embeds:[logEmbed]});
	}
});
client.on(Events.GuildBanAdd, async (ban) => {
	if (!await safetyCheck(ban)) return;
	const {guild, user} = ban;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(errorColor);
	logEmbed.setTitle('User banned');
	logEmbed.setAuthor({name:user.tag,iconURL:user.displayAvatarURL()});
	logEmbed.setDescription(`<@${user.id}> was banned from ${guild.name}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.GuildBanRemove, async (ban) => {
	if (!await safetyCheck(ban)) return;
	const {guild, user} = ban;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(confirmColor);
	logEmbed.setTitle('User unbanned');
	logEmbed.setAuthor({name:user.tag,iconURL:user.displayAvatarURL()});
	logEmbed.setDescription(`<@${user.id}> was unbanned from ${guild.name}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setFooter({text:`User ID: ${user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.MessageReactionAdd, async (reaction, user) => {
	if (!await safetyCheck(user)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(confirmColor);
	logEmbed.setTitle('Reaction added');
	logEmbed.setAuthor({name:user.tag,iconURL:user.displayAvatarURL()});
	logEmbed.setDescription(`<@${user.id}> added a reaction to ${reaction.message.url} with ${reaction.emoji}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setThumbnail(reaction.emoji.imageURL());
	logEmbed.setFooter({text:`User ID: ${user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});
client.on(Events.MessageReactionRemove, async (reaction, user) => {
	if (!await safetyCheck(user)) return;
	let logEmbed = new EmbedBuilder();
	logEmbed.setColor(errorColor);
	logEmbed.setTitle('Reaction removed');
	logEmbed.setAuthor({name:user.tag,iconURL:user.displayAvatarURL()});
	logEmbed.setDescription(`<@${user.id}> removed a reaction to ${reaction.message.url} with ${reaction.emoji}`);
	logEmbed.setTimestamp(Date.now());
	logEmbed.setThumbnail(reaction.emoji.imageURL());
	logEmbed.setFooter({text:`User ID: ${user.id}`});
	await logChannel.send({embeds:[logEmbed]});
});

client.reloadCommands();
//client.reloadSlashCommands();
client.sql.connect();
client.login(token);