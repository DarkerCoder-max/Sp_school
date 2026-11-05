export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.WHATSAPP_RECIPIENT;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";

  if (!token || !phoneNumberId || !recipient) {
    return res.status(500).json({ success: false, error: "WhatsApp environment variables are missing." });
  }

  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: "Message is required." });
  }

  // 🪄 THE MAGIC: We extract the 6 pieces from your exact sentence format
  // Example: "Assalam o Alaikum Bilal Sheikh, you have been assigned Class 3, period 2 (8:40 - 5:55), Islamiat, covering for Ayesha Sheikh today."
  const regex = /Assalam o Alaikum (.*?), you have been assigned Class (.*?), period (.*?) \((.*?)\), (.*?), covering for (.*?) today\./i;
  const match = message.match(regex);

  let teacher = "Unknown";
  let className = "Unknown";
  let period = "Unknown";
  let time = "Unknown";
  let subject = "Unknown";
  let substitute = "Unknown";

  if (match) {
    teacher = match[1];
    className = match[2];
    period = match[3];
    time = match[4];
    subject = match[5];
    substitute = match[6];
  } else {
    // If your UI changes the sentence format slightly, this prevents it from crashing
    return res.status(400).json({ 
      success: false, 
      error: "The message format did not match. It must be exactly: 'Assalam o Alaikum [Name], you have been assigned Class [Class], period [Period] ([Time]), [Subject], covering for [Substitute] today.'" 
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
            name: "teacher_substiuanal_notifi", 
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: `*${teacher}*` },      // {{1}} Bold Teacher Name
                  { type: "text", text: `*${className}*` },    // {{2}} Bold Class
                  { type: "text", text: `*${period}*` },       // {{3}} Bold Period
                  { type: "text", text: time },         // {{4}}
                  { type: "text", text: subject },      // {{5}}
                  { type: "text", text: substitute }    // {{6}}
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
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("WhatsApp request failed:", error);
    return res.status(500).json({
      success: false,
      error: "Could not connect to WhatsApp API.",
    });
  }
}
