import prisma from './config/prisma.js';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Email required");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  if (user) {
    console.log("OTP Code:", user.otpCode || "NULL");
  } else {
    console.log("User not found");
  }
}

main().catch(err => {
  console.error("Error running query:", err);
});
