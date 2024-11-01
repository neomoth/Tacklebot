module.exports = {
	data:{
		name:'scavenge',
		description:'scavenge money becuase you\'re a broke ass mf',
		usage:`]scavenge`,
		aliases:['scav'],
	},
	async execute(i){
		await i.client.sql.promise(i.client.sql.addUser, i.author.id);
		const currentTimestamp = Date.now();
		let {scavengeTimestamp} = await i.client.sql.promise(i.client.sql.getScavengeTimestamp, i.author.id);
		const goalTimeDifference = 3 * 60 * 60 * 1000;
		const timeElapsed = currentTimestamp - scavengeTimestamp;
		if (timeElapsed < goalTimeDifference && i.author.id!=1134602054288015380) {
			const timeRemaining = goalTimeDifference - timeElapsed;
			const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    		const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    		const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
			await i.reply(`You have to wait ${hours}h${minutes}m${seconds}s before you can scavenge again.`);
			return;
		}

		await i.client.sql.promise(i.client.sql.setScavengeTimestamp, i.author.id, currentTimestamp);

		let rng = Math.floor(Math.random() * 163);
		let findings;
		if (rng>162) {
			let rng2 = Math.floor(Math.random() * 1000);
			if (rng2>990) {
				let rng3 = Math.floor(Math.random() * 2354);
				findings = rng3;
			}
			else findings = rng;
		}
		else findings = rng;
		await i.reply("You scrounged around like a rodent and found $"+findings);
		await i.client.sql.promise(i.client.sql.addMoney, i.author.id, findings);
	}
}