require('isomorphic-unfetch');
const { promises: fs } = require('fs');
const path = require('path');

async function main() {
	const readmeTemplate = (
		await fs.readFile(path.join(process.cwd(), './README.template.md'))
	).toString('utf-8');

	const quote = await (await fetch('http://api.quotable.io/random')).json();

	const readme = readmeTemplate
		.replace('{quote}', quote.content)
		.replace('{author}', `- ${quote.author}`);

	await fs.writeFile('README.md', readme);
}

main();
