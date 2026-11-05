export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.WHATSAPP_RECIPIENT;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";

  if (!token || !phoneNumberId || !recipient) {
    return res.status(500).json({
      success: false,
      error: "WhatsApp environment variables are missing.",
    });
  }

  const message = req.body?.message;

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 4096
  ) {
    return res.status(400).json({
      success: false,
      error: "Message must contain 1–4096 characters.",
    });
  }

  // Only allow a configured international number.
  if (!/^\d{8,15}$/.test(recipient)) {
    return res.status(500).json({
      success: false,
      error: "WHATSAPP_RECIPIENT must contain digits only.",
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: "teacher_substiuanal_notifi", // Kept exactly as your screenshot
            language: {
              code: "en"
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Hina" },
                  { type: "text", text: "5" },
                  { type: "text", text: "6" },
                  { type: "text", text: "5:66 - 6:55" },
                  { type: "text", text: "Math" },
                  { type: "text", text: "Miss Rabia" }
                ]
              }
            ]
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);

      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "Meta rejected the WhatsApp message.",
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data?.messages?.[0]?.id || null,
      message: "Meta accepted the message.",
    });
  } catch (error) {
    console.error("WhatsApp request failed:", error);

    return res.status(500).json({
      success: false,
      error: "Could not connect to WhatsApp API.",
    });
  }
}
