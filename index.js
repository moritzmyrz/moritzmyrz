require('isomorphic-unfetch');
const { Chess } = require('chess.js');
const { promises: fs } = require('fs');
const path = require('path');

function getBoardAtPly(gamePgn, plyCount) {
	if (!gamePgn) {
		return null;
	}

	const game = new Chess();
	game.loadPgn(gamePgn);
	const history = game.history();
	const boundedPly = Math.min(Math.max(plyCount, 0), history.length);

	const board = new Chess();
	for (let index = 0; index < boundedPly; index += 1) {
		board.move(history[index]);
	}

	return board;
}

function parseUciMove(uciMove) {
	if (!uciMove || uciMove.length < 4) {
		return null;
	}

	return {
		from: uciMove.slice(0, 2),
		to: uciMove.slice(2, 4),
		promotion: uciMove.length > 4 ? uciMove.slice(4, 5) : undefined,
	};
}

function isUciLegal(board, uciMove) {
	const parsedMove = parseUciMove(uciMove);
	if (!parsedMove) {
		return false;
	}

	const testBoard = new Chess(board.fen());
	try {
		const result = testBoard.move(parsedMove);
		return Boolean(result);
	} catch (error) {
		return false;
	}
}

function getPuzzlePosition(gamePgn, initialPly, firstMove) {
	const ply = Number.isInteger(initialPly) ? initialPly : Number(initialPly) || 0;
	const candidatePlies = [ply, ply + 1];
	const candidateBoards = candidatePlies
		.map((candidatePly) => getBoardAtPly(gamePgn, candidatePly))
		.filter(Boolean);

	const matchedBoard = candidateBoards.find((board) => isUciLegal(board, firstMove));
	const board = matchedBoard || candidateBoards[candidateBoards.length - 1];
	if (!board) {
		return null;
	}

	return {
		fen: board.fen(),
		turn: board.turn() === 'w' ? 'white' : 'black',
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
	const puzzlePosition = getPuzzlePosition(game.pgn, puzzle.initialPly, firstMove);
	const boardOrientation = puzzlePosition?.turn || 'white';
	const boardImageUrl = puzzlePosition?.fen
		? `https://lichess1.org/export/fen.gif?fen=${encodeURIComponent(puzzlePosition.fen)}&color=${boardOrientation}`
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
