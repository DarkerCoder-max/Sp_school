export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Optional but strongly recommended
  if (req.headers["x-api-key"] !== process.env.API_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
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

  if (!/^\d{8,15}$/.test(recipient)) {
    return res.status(500).json({
      success: false,
      error: "WHATSAPP_RECIPIENT must contain digits only.",
    });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const p = body?.params ?? {};

  // If you keep the template, map real values — don't hardcode.
  const params = [
    p.teacherName,
    p.period,
    p.classNumber,
    p.timeSlot,
    p.subject,
    p.substituteTeacher,
  ];

  if (params.some((v) => typeof v !== "string" || !v.trim())) {
    return res.status(400).json({
      success: false,
      error: "All 6 template parameters are required.",
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
            name: "teacher_substitutional_notification", // exact approved name
            language: { code: "en" },                    // exact approved code
            components: [
              {
                type: "body",
                parameters: params.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "Meta rejected the WhatsApp message.",
        code: data?.error?.code ?? null,
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
