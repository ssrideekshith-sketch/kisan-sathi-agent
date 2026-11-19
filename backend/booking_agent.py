"""Visible Playwright automation for the simulated central fertilizer booking portal."""

import re
from typing import Callable, Optional

from playwright.sync_api import sync_playwright


PORTAL_URL = "http://localhost:5173/govt-portal"


def run_booking_agent(
    ppb_number: str,
    otp: str,
    shop_keyword: str,
    bags: int,
    progress_callback: Optional[Callable[[dict], None]] = None,
    fertilizer_type: str = "Urea",
) -> dict:
    """Book fertilizer and report each visible automation milestone."""
    browser = None
    steps = []

    def report(step: str, status: str) -> None:
        milestone = {"step": step, "status": status}
        steps.append(milestone)
        if progress_callback:
            try:
                progress_callback(milestone)
            except Exception:
                pass

    try:
        report("navigating", "active")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=False, slow_mo=600)
            page = browser.new_page()
            page.goto(PORTAL_URL, wait_until="domcontentloaded")
            report("navigating", "completed")

            report("filling", "active")
            page.locator("#ppb-number").fill(ppb_number)
            page.locator("#get-otp-btn").click()

            otp_input = page.locator("#otp-input")
            otp_input.wait_for(state="visible")
            otp_input.fill(otp)
            page.locator("#verify-otp-btn").click()

            shop_select = page.locator("#shop-select")
            shop_select.wait_for(state="visible")
            fertilizer_select = page.locator("#fertilizer-select")
            fertilizer_select.wait_for(state="visible")
            labels = fertilizer_select.locator("option").all_text_contents()
            normalized_product = re.sub(r"[^a-z0-9]", "", fertilizer_type.casefold().replace("sulfate", "sulphate"))
            for alias, portal_code in (
                ("ammoniumsulfate", "ammoniumsulphate"),
                ("triplesuperphosphate", "tsp"),
                ("monoammoniumphosphate", "map"),
            ):
                if alias in normalized_product:
                    normalized_product = portal_code
                    break
            selected_product = next(
                (label.strip() for label in labels if normalized_product and normalized_product in re.sub(r"[^a-z0-9]", "", label.casefold().replace("sulfate", "sulphate"))),
                None,
            )
            if selected_product is None and fertilizer_type.casefold().startswith("npk"):
                selected_product = next((label.strip() for label in labels if "npk" in label.casefold()), None)
            if selected_product is None:
                raise RuntimeError(f"Fertilizer product is not available in this portal: {fertilizer_type}")
            fertilizer_select.select_option(label=selected_product)
            report("filling", "completed")

            report("selecting", "active")
            option_labels = shop_select.locator("option").all_text_contents()
            available = [label.strip() for label in option_labels if "0 bags" not in label.lower()]
            if not available:
                raise RuntimeError("No fertilizer shops have stock available.")

            keyword = shop_keyword.casefold().strip()
            selected_label = next(
                (label for label in available if keyword and keyword in label.casefold()),
                available[0],
            )
            shop_select.select_option(label=selected_label)
            report("selecting", "completed")

            report("confirming", "active")
            page.locator("#bags-input").fill(str(bags))
            page.locator("#confirm-btn").click()

            receipt = page.locator("#booking-receipt")
            receipt.wait_for(state="visible")
            receipt_text = receipt.inner_text()
            report("confirming", "completed")
            report("completed", "completed")
            return {
                "status": "success",
                "receipt_text": receipt_text,
                "shop_selected": selected_label,
                "bags": bags,
                "fertilizer_type": fertilizer_type,
                "steps": steps,
            }
    except Exception as exc:
        report("failed", "failed")
        return {"status": "error", "message": str(exc), "fertilizer_type": fertilizer_type, "steps": steps}
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
