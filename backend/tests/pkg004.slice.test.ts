import assert from 'node:assert/strict';
import { ExportFormat, RankingScope, TieBreakerStrategy } from '@prisma/client';
import { buildCsvBuffer, buildXlsxBuffer } from '../src/modules/reports-exports/application/export-file.util';
import { calculateRankings } from '../src/modules/scoring-ranking/application/ranking-calculator';

function testRankingCalculator() {
  const result = calculateRankings({
    config: {
      pointsPerValidPiece: 10,
      largestCaptureBonusPoints: 5,
      distinctSpeciesPoints: 3,
      tieBreakerStrategy: TieBreakerStrategy.MVP_V1,
    },
    captures: [
      {
        id: 'c1',
        participantId: 'p1',
        participantName: 'Ana Lopez',
        teamId: 't1',
        teamName: 'Equipo Sur',
        species: 'Dorado',
        length: 50,
        capturedAt: new Date('2026-04-30T10:00:00.000Z'),
      },
      {
        id: 'c2',
        participantId: 'p1',
        participantName: 'Ana Lopez',
        teamId: 't1',
        teamName: 'Equipo Sur',
        species: 'Surubi',
        length: 40,
        capturedAt: new Date('2026-04-30T10:10:00.000Z'),
      },
      {
        id: 'c3',
        participantId: 'p2',
        participantName: 'Beto Diaz',
        teamId: 't2',
        teamName: 'Equipo Norte',
        species: 'Dorado',
        length: 55,
        capturedAt: new Date('2026-04-30T09:59:00.000Z'),
      },
      {
        id: 'c4',
        participantId: 'p2',
        participantName: 'Beto Diaz',
        teamId: 't2',
        teamName: 'Equipo Norte',
        species: 'Surubi',
        length: 35,
        capturedAt: new Date('2026-04-30T10:05:00.000Z'),
      },
    ],
    adjustments: [
      {
        id: 'a1',
        participantId: 'p2',
        participantName: 'Beto Diaz',
        teamId: 't2',
        teamName: 'Equipo Norte',
        pointsDelta: -5,
      },
    ],
  });

  assert.equal(result.individual.length, 2);
  assert.equal(result.individual[0].competitorId, 'p2');
  assert.equal(result.individual[0].totalPoints, 26);
  assert.equal(result.individual[0].penaltyPoints, -5);
  assert.equal(result.individual[1].competitorId, 'p1');
  assert.equal(result.individual[1].totalPoints, 26);
  assert.equal(result.individual[1].distinctSpeciesCount, 2);

  assert.equal(result.team.length, 2);
  assert.equal(result.team[0].scope, RankingScope.TEAM);
  assert.equal(result.team[0].competitorId, 't2');
  assert.equal(result.team[1].competitorId, 't1');
}

function testExportBuffers() {
  const headers = ['position', 'competitorName', 'totalPoints'];
  const rows = [
    { position: 1, competitorName: 'Ana Lopez', totalPoints: 26 },
    { position: 2, competitorName: 'Beto Diaz', totalPoints: 21 },
  ];

  const csvBuffer = buildCsvBuffer({ headers, rows });
  const csvText = csvBuffer.toString('utf8');
  assert.match(csvText, /position,competitorName,totalPoints/);
  assert.match(csvText, /"Ana Lopez"/);

  const xlsxBuffer = buildXlsxBuffer({ headers, rows }, ExportFormat.XLSX);
  assert.ok(xlsxBuffer.length > 100);
  assert.equal(xlsxBuffer.subarray(0, 2).toString('binary'), 'PK');
}

testRankingCalculator();
testExportBuffers();
console.log('PKG-004 slice checks passed');
