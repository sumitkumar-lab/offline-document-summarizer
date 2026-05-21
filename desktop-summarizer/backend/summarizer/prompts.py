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
    "action_items": (
        "Extract practical action items from the following content. Use a task-focused format. "
        "For each item, include the task, owner if mentioned, deadline if mentioned, and priority if clear. "
        "If the owner or deadline is not stated, write 'Not specified'.\n\n"
        "{text}\n\nAction items:"
    ),
    "eli10": (
        "Explain the following content like the reader is 10 years old. Use simple words, short sentences, "
        "and friendly examples while keeping the meaning accurate:\n\n"
        "{text}\n\nSimple explanation:"
    ),
    "meeting_notes": (
        "Convert the following content into clear meeting notes. Include sections for topics discussed, "
        "decisions, action items, blockers, and next steps. Only include sections that are supported by the content:\n\n"
        "{text}\n\nMeeting notes:"
    ),
    "research_paper": (
        "Summarize the following content as a research paper summary. Cover the research question or purpose, "
        "method or approach, key findings, evidence, limitations, and practical implications:\n\n"
        "{text}\n\nResearch paper summary:"
    ),
    "legal_policy": (
        "Summarize the following legal or policy content in plain language. Identify the purpose, who or what is affected, "
        "key rules or obligations, deadlines, exceptions, risks, and open questions. Do not provide legal advice or invent details:\n\n"
        "{text}\n\nLegal/policy summary:"
    ),
    "email": (
        "Rewrite the following content as a clear email-style summary. Include a short subject line, a brief opening, "
        "the main points, requested actions if any, and a concise closing:\n\n"
        "{text}\n\nEmail-style summary:"
    ),
    "x_thread": (
        "Turn the following content into an original X-style post thread. Use numbered posts, keep each post under 280 characters, "
        "make the thread easy to scan, and avoid copying sentences from the source text:\n\n"
        "{text}\n\nX-style thread:"
    ),
    "reddit_linkedin": (
        "Create original, plagiarism-free social post drafts from the following content. Provide one Reddit-style post and one "
        "LinkedIn-style post. Rewrite ideas in fresh wording, keep the claims faithful to the source, and avoid copying sentences:\n\n"
        "{text}\n\nReddit and LinkedIn posts:"
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
