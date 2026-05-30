import * as quizzesService from './src/services/quizzes.service.js';
import prisma from './src/config/prisma.js';

prisma.visitSession.findUnique = async () => ({ userId: 1, user: { ageCategory: 'ADULT' } });
prisma.quiz.findFirst = async () => ({ id: 1, title: 'Test Quiz', questions: [{ id: 101, questionText: 'Q1?', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', points: 10 }] });

async function test() {
  try {
    await quizzesService.fetchQuiz(1, 10, 'PRE_ZOO', undefined);
    console.log("SUCCESS");
  } catch(e) {
    console.log("ERROR IS", e.name, e.message, e.stack);
  }
}
test();
