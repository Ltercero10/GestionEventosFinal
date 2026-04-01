require("dotenv").config();
const { enviarCorreo } = require("./src/services/emailService");

(async () => {
  try {
    await enviarCorreo(
      "marciomass03@gmail.com",
      "Prueba de correo",
      "<h1>Correo funcionando correctamente</h1>"
    );

    console.log("✅ Prueba enviada");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();