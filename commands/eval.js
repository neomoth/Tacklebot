const {EmbedBuilder} = require("discord.js");
const{globalPrefix,primaryColor,errorColor}=require('../config.json');
module.exports = {
	data:{
		name:'eval',
		description:'evaluate js | reserved for bot maintainer',
		usage:`${globalPrefix}eval <code> [-s <alias> (save)] [-h (hide)] | ${globalPrefix} del <alias>`,
		aliases:['e'],
		mod:true
	},async execute(i,args){
		if(i.author.id!=1134602054288015380)return;
		let hide = false;
		let save = true;
		let name = '';
		let lastArg;
		if(args[1]==='del'){
			for(const key of i.client.storedData.keys()){
				if(key===args[2]) {i.client.storedData.delete(key);}
			}
			return;
		}
		for(let i = 1;i<args.length;i++){
			if(args[i]==='-h'){
				hide = true;
				lastArg = i;
				break;
			}
		}
		for (const key of i.client.storedData.keys()){
			if(key===args[1]){
				let eRes = i.client.storedData.get(args[1].toString());
				let res = eval(eRes[0]);
				if(hide)i.delete();
				else try{
					await i.reply({embeds:[new EmbedBuilder().setColor(primaryColor).setTitle('eval result').setDescription(res.toString())]});
				}catch(e){
					// console.error(e);
					await i.reply({embeds:[new EmbedBuilder().setColor(errorColor).setTitle('eval result').setDescription((typeof res).toString())]});
				}
				return;
			}
		}
		if(args[args.length-2]==='-s'){
			save = true;
			name = args[args.length-1].toString();
			args = args.slice(0,args.length-2);
		}
		let evalCmd;
		if(hide) evalCmd = args.slice(1,lastArg).join(' ');
		else evalCmd = args.slice(1).join(' ');
		let evaluated = eval(evalCmd);
		if(save) i.client.storedData.set(name,[evalCmd,i]);
		if(hide){
			await i.delete();
		}else{
			try{
				await i.reply({embeds:[new EmbedBuilder().setColor(primaryColor).setTitle('eval result').setDescription(evaluated.toString())]});
			}catch(e){
				// console.error(e);
				await i.reply({embeds:[new EmbedBuilder().setColor(errorColor).setTitle('eval result').setDescription((typeof evaluated).toString())]});
			}
		}
	}
}