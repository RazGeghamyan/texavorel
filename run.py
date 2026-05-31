import uvicorn

if __name__ == "__main__":
    # Միացնում ենք սերվերը localhost:8000 պորտով
    # Քանի որ ապլիկացիան հիմա app/main.py-ում է, գրում ենք "app.main:app"
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)