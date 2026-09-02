import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Moliya Tracker API",
      version: "1.0.0",
      description:
        "Insonlarning kunlik, haftalik va oylik kirim-chiqimlarini hisob-kitob qilish tizimi.\n\n" +
        "**Autentifikatsiya:** Barcha himoyalangan endpointlar `Authorization: Bearer <accessToken>`\n" +
        "headerini talab qiladi. Avval register/login orqali token oling va `Authorize` tugmasidan foydalaning.",
    },
    servers: [
      { url: "/", description: "Default server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Ro'yxatdan o'tish, login va profil boshqaruvi" },
      { name: "Categories", description: "Kategoriyalar (income/expense)" },
      { name: "Transactions", description: "Kirim-chiqim tranzaksiyalari" },
      { name: "Budgets", description: "Oylik byudjet limitlari" },
      { name: "Stats", description: "Statistika va tahlil" },
      { name: "AI", description: "AI moliya maslahatlari" },
      { name: "Admin", description: "Admin panel boshqaruvi (faqat adminlar)" },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
