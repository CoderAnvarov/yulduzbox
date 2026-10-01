from app.providers.base import ProviderResult, StarsProvider


class ManualProvider(StarsProvider):
    """Admin Stars'ni qo'lda yetkazadi. Tizim hech narsani avtomatik yubormaydi."""

    name = "manual"

    async def submit_order(self, order_id: int, recipient_username: str, stars_amount: int) -> ProviderResult:
        return ProviderResult(accepted=True, manual=True, message="Admin qo'lda yetkazadi")


provider: StarsProvider = ManualProvider()
