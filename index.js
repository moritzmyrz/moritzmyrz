require('isomorphic-unfetch');
const { Chess } = require('chess.js');
const { promises: fs } = require('fs');
const path = require('path');

function getPuzzlePosition(gamePgn, initialPly) {
	if (!gamePgn) {
		return null;
	}

	const game = new Chess();
	game.loadPgn(gamePgn);
	const history = game.history();
	const ply = Number.isInteger(initialPly) ? initialPly : Number(initialPly) || 0;
	const boundedPly = Math.min(Math.max(ply, 0), history.length);

	const board = new Chess();
	for (let index = 0; index < boundedPly; index += 1) {
		board.move(history[index]);
	}

	return {
		fen: board.fen(),
		turnLabel: board.turn() === 'w' ? 'White to move' : 'Black to move',
	};
}

async function main() {
	const readmeTemplate = (
		await fs.readFile(path.join(process.cwd(), './README.template.md'))
	).toString('utf-8');

	const response = await fetch('https://lichess.org/api/puzzle/next');
	if (!response.ok) {
		throw new Error(`Failed to fetch puzzle (${response.status})`);
	}

	const payload = await response.json();
	const puzzle = payload.puzzle || {};
	const game = payload.game || {};
	const players = Array.isArray(game.players) ? game.players : [];

	const white = players.find((player) => player.color === 'white');
	const black = players.find((player) => player.color === 'black');

	const whiteName = white?.name || white?.id || 'White';
	const blackName = black?.name || black?.id || 'Black';
	const whiteRating = white?.rating ? ` (${white.rating})` : '';
	const blackRating = black?.rating ? ` (${black.rating})` : '';

	const puzzleId = puzzle.id || 'unknown';
	const puzzleLink =
		puzzle.id ? `https://lichess.org/training/${puzzle.id}` : 'https://lichess.org/training';
	const gameLink = game.id ? `https://lichess.org/${game.id}` : 'https://lichess.org';
	const puzzleRating = puzzle.rating || 'N/A';
	const puzzleThemes =
		Array.isArray(puzzle.themes) && puzzle.themes.length > 0
			? puzzle.themes.join(', ')
			: 'N/A';
	const firstMove =
		Array.isArray(puzzle.solution) && puzzle.solution.length > 0
			? puzzle.solution[0]
			: 'N/A';
	const timeControl = game.clock || 'N/A';
	const puzzlePosition = getPuzzlePosition(game.pgn, puzzle.initialPly);
	const boardImageUrl = puzzlePosition?.fen
		? `https://lichess1.org/export/fen.gif?fen=${encodeURIComponent(puzzlePosition.fen)}`
		: '';
	const sideToMove = puzzlePosition?.turnLabel || 'Side to move unavailable';

	const readme = readmeTemplate
		.replace('{puzzleId}', puzzleId)
		.replace('{puzzleLink}', puzzleLink)
		.replace('{puzzleRating}', String(puzzleRating))
		.replace('{puzzleThemes}', puzzleThemes)
		.replace('{whitePlayer}', `${whiteName}${whiteRating}`)
		.replace('{blackPlayer}', `${blackName}${blackRating}`)
		.replace('{timeControl}', String(timeControl))
		.replace('{gameLink}', gameLink)
		.replace('{firstMove}', firstMove)
		.replace('{boardImageUrl}', boardImageUrl)
		.replace('{sideToMove}', sideToMove);

	await fs.writeFile('README.md', readme);
}

main();
