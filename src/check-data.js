import prisma from './config/prisma.js';

async function main() {
  const sessions = await prisma.visitSession.findMany({
    include: {
      user: true,
      retentionSchedules: true
    }
  });
  console.log("Session details:");
  console.log(JSON.stringify(sessions, null, 2));
}

main().catch(err => {
  console.error("Error:", err);
});
