from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ProviderResult:
    accepted: bool
    manual: bool
    message: str = ""


class StarsProvider(ABC):
    """
    Stars yetkazish adapteri interfeysi.
    Kelajakda RASMIY va RUXSAT ETILGAN API paydo bo'lsa, shu interfeysni amalga oshiruvchi
    yangi klass yoziladi. Fragment uchun ochiq API mavjud deb FARAZ QILINMAGAN.
    """

    name: str

    @abstractmethod
    async def submit_order(self, order_id: int, recipient_username: str, stars_amount: int) -> ProviderResult: ...
