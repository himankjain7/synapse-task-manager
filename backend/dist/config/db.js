"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Instantiate the Prisma Client with selective logging
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
// Gracefully close connection on process termination
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
exports.default = prisma;
