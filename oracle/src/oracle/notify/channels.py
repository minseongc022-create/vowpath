"""Notification hooks — Telegram / email (optional env)."""

from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

import httpx

logger = logging.getLogger("oracle.notify")


def send_telegram(text: str) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        logger.info("Telegram not configured — skip")
        return False
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        r = httpx.post(url, json={"chat_id": chat_id, "text": text[:3500]}, timeout=20.0)
        r.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("telegram failed: %s", exc)
        return False


def send_email(subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    to_addr = os.getenv("SMTP_TO", "").strip() or user
    if not host or not user or not password:
        logger.info("SMTP not configured — skip")
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = to_addr
        msg.set_content(body)
        port = int(os.getenv("SMTP_PORT", "587"))
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception as exc:
        logger.warning("email failed: %s", exc)
        return False


def notify_report(report_path: Path) -> dict[str, bool]:
    text = report_path.read_text(encoding="utf-8")[:3000]
    return {
        "telegram": send_telegram(f"Project Oracle report\n{report_path.name}\n\n{text}"),
        "email": send_email(f"Oracle daily report {report_path.name}", text),
    }
