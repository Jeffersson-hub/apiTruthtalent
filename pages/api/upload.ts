document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("cv-upload-form");
  const fileInput = document.getElementById("cv-files");
  const message = document.getElementById("after-upload");

  if (!form || !fileInput) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    message.textContent = "Téléversement en cours...";
    message.style.display = "block";

    const files = fileInput.files;
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("cv-files[]", files[i]);
    }

    try {
      const response = await fetch("https://apitruthtalent.vercel.app/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        message.textContent = "✅ Téléversement terminé avec succès.";
      } else {
        message.textContent = "❌ Erreur pendant l'envoi (réponse invalide).";
        console.error("Erreur serveur:", await response.text());
      }
    } catch (err) {
      message.textContent = "❌ Échec de la connexion à l’API.";
      console.error("Erreur fetch:", err);
    }
  });
});
