from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# 1. Ներմուծում ենք բազայի կարգավորումները՝ աղյուսակները ստեղծելու համար
from core.database import engine, Base

# 2. Ներմուծում ենք բոլոր Ռոուտերները
from app.routers.api_v1.wedding import router as wedding_router
from app.routers.api_v1.table import router as table_router
from app.routers.api_v1.guest import router as guest_router
from app.routers.api_v1.guest_members import router as guest_member_router
from app.routers.views import pages  # Frontend էջերի ռոուտերը

# Ավտոմատ ստեղծում ենք բոլոր MySQL աղյուսակները բազայի մեջ, եթե դրանք չկան
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Wedding Planner API 💍",
    description="Ինտերակտիվ սրահի և հյուրերի նստեցման համակարգ",
    version="1.0.0"
)

# Կապում ենք API ռոուտերները
app.include_router(wedding_router)
app.include_router(table_router)
app.include_router(guest_router)
app.include_router(guest_member_router)

# Կապում ենք Frontend էջերի ռոուտերը
app.include_router(pages.router)