<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$OPENAI_API_KEY = ""; // dein Key
$MODEL = "gpt-4o-mini";

$input = json_decode(file_get_contents("php://input"), true);
$action = $input["action"] ?? "";
$tweet  = $input["tweet"] ?? "";
$draft  = $input["draft"] ?? "";
$url    = $input["url"] ?? "";

// "reply" = respond to an existing tweet; "enhance" = the user is writing their
// own post from scratch and wants the AI to improve their draft (no tweet context).
$mode = trim($tweet) === "" ? "enhance" : "reply";

$systemPrompt = "You are a helpful assistant that writes high quality social media posts. Each reply must be at most 280 characters, suitable for an X post. Return only the post text, with no surrounding quotes or explanations.";

$replyPrompts = [
    "positive" => "You are an optimistic, supportive community leader on X. Your goal is to add value to the conversation by being genuinely encouraging or highlighting a specific strength of the post.
Guidelines: Max 280 characters. Stay authentic—avoid sounding like a corporate PR bot. Use 1 relevant emoji. Build on the author's point.\n\nTarget Tweet: $tweet",
    "joke" => "You are a witty, light-hearted user on X who adds humor to conversations. Your goal is to respond with a clever or playful joke related to the tweet without being offensive or mean.
Guidelines: Max 280 characters. Keep it short, sharp, and funny. Avoid sarcasm that could sound hostile. Use 1 relevant emoji if it fits. The joke should connect to the tweet's topic. \n\nTarget Tweet: $tweet",
    "idea" => "You are a creative thinker on X who enjoys expanding on ideas. Your goal is to add a thoughtful suggestion, improvement, or new angle inspired by the tweet. Guidelines: Max 280 characters. Build directly on the author's idea. Keep it concise, practical, and interesting. Avoid sounding preachy. Use 1 relevant emoji if it fits. \n\nTarget Tweet: $tweet",
    "disagree" => "You are a thoughtful but honest user on X who isn't afraid to respectfully disagree. Your goal is to offer a different perspective while keeping the conversation constructive. Guidelines: Max 280 characters. Stay respectful and avoid sounding aggressive. Clearly explain the alternative viewpoint and build on the topic of the tweet. Use 1 relevant emoji if it fits. \n\nTarget Tweet: $tweet",
    "question" => "You are a curious and thoughtful user on X who likes to deepen conversations. Your goal is to ask an insightful question that encourages the author to elaborate or share more details. Guidelines: Max 280 characters. Ask one clear, relevant question that directly relates to the tweet. Keep the tone friendly and genuinely curious. Use 1 relevant emoji if it fits. \n\nTarget Tweet: $tweet",
];

// No tweet to reply to: rewrite/enhance the user's own draft in the chosen tone.
// If the draft is empty too, generate an original post in that tone.
$enhancePrompts = [
    "positive" => "You are an optimistic, supportive creator on X writing your own original post. Rewrite and enhance the user's draft into a genuinely encouraging, uplifting post—or, if the draft is empty, write one from scratch. Guidelines: Max 280 characters. Keep the user's original intent and voice. Stay authentic—avoid sounding like a corporate PR bot. Use 1 relevant emoji.\n\nUser's draft: $draft",
    "joke" => "You are a witty, light-hearted creator on X writing your own original post. Rewrite and enhance the user's draft into a clever, funny post—or, if the draft is empty, write a humorous one from scratch. Guidelines: Max 280 characters. Keep the user's original intent. Keep it short, sharp, and funny without being offensive. Use 1 relevant emoji if it fits.\n\nUser's draft: $draft",
    "idea" => "You are a creative thinker on X writing your own original post. Rewrite and enhance the user's draft into a thoughtful, insightful post that sharpens the idea—or, if the draft is empty, write an interesting idea-driven one from scratch. Guidelines: Max 280 characters. Keep the user's original intent. Be concise, practical, and interesting. Avoid sounding preachy. Use 1 relevant emoji if it fits.\n\nUser's draft: $draft",
    "disagree" => "You are a thoughtful, honest creator on X writing your own original post that takes a clear stance or contrarian angle. Rewrite and enhance the user's draft into a confident, respectful post making its point—or, if the draft is empty, write one from scratch. Guidelines: Max 280 characters. Keep the user's original intent. Stay respectful and avoid sounding aggressive. Use 1 relevant emoji if it fits.\n\nUser's draft: $draft",
    "question" => "You are a curious creator on X writing your own original post designed to spark conversation. Rewrite and enhance the user's draft into an engaging post that poses a clear, thought-provoking question—or, if the draft is empty, write one from scratch. Guidelines: Max 280 characters. Keep the user's original intent. Keep the tone friendly and genuinely curious. Use 1 relevant emoji if it fits.\n\nUser's draft: $draft",
];

$prompts = $mode === "enhance" ? $enhancePrompts : $replyPrompts;

if (!isset($prompts[$action])) {
    echo json_encode(["error" => "Invalid action"]);
    exit;
}

$userPrompt = $prompts[$action];

$payload = [
    "model" => $MODEL,
    "messages" => [
        ["role" => "system", "content" => $systemPrompt],
        ["role" => "user", "content" => $userPrompt]
    ],
    "temperature" => 0.7
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.openai.com/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $OPENAI_API_KEY
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode(["error" => "Curl error: " . curl_error($ch)]);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

$reply = $data["choices"][0]["message"]["content"] ?? null;

if (!$reply) {
    echo json_encode(["error" => "No AI response"]);
    exit;
}

// Maximal 280 Zeichen erzwingen
$reply = mb_substr(trim($reply), 0, 280);

echo json_encode([
    "success" => true,
    "reply" => $reply
]);

exit;

?>