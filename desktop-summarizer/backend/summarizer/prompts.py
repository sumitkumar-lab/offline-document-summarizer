from __future__ import annotations


MODE_PROMPTS = {
    "concise": (
        "Please summarize the following content into a concise paragraph:\n\n"
        "{text}\n\nSummary:"
    ),
    "bullets": (
        "Summarize the following content into clear bullet points:\n\n"
        "{text}\n\nBullet summary:"
    ),
    "key_ideas": (
        "Extract only the key ideas from the following content. Keep the answer brief and focused:\n\n"
        "{text}\n\nKey ideas:"
    ),
    "study_notes": (
        "Convert the following content into simple study notes with headings, key ideas, and important points:\n\n"
        "{text}\n\nStudy notes:"
    ),
}

LENGTH_HINTS = {
    "short": "Keep the summary short.",
    "medium": "Use a moderate level of detail.",
    "detailed": "Include useful detail while staying concise.",
}


def build_prompt(text: str, mode: str, length: str) -> str:
    template = MODE_PROMPTS.get(mode, MODE_PROMPTS["concise"])
    length_hint = LENGTH_HINTS.get(length, LENGTH_HINTS["medium"])
    output_rule = (
        "Your entire response must be the requested summary. Start immediately "
        "with the summary content. Never write confirmations, introductions, "
        "or phrases such as 'Sure', 'Here is', or 'Summary:'."
    )
    return f"{length_hint}\n{output_rule}\n\n{template.format(text=text.strip())}"
