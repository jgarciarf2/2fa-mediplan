// tests/mocks/prismaMock.js
const mockPrisma = {
  users: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  patientDemographics: {
    create: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

module.exports = mockPrisma;
