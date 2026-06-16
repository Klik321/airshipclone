# חיבור טופס הפנייה ל-Google Sheets

הטופס באתר שולח כל פנייה ל-Google Apps Script, שמוסיף שורה לגיליון Google שלך.
זה רץ על השרתים של Google — עובד גם כשהמחשב שלך כבוי.

## שלבים (פעם אחת, ~2 דקות)

1. היכנס ל-https://sheets.google.com וצור גיליון חדש. תן לו שם, למשל **Airship – פניות**.
2. בתוך הגיליון: **Extensions → Apps Script**.
3. מחק את הקוד שמופיע, והדבק את כל התוכן של הקובץ **Code.gs** (מהתיקייה הזו).
4. לחץ **Save** (אייקון הדיסקט).
5. לחץ **Deploy → New deployment**.
   - ליד "Select type" בחר **Web app**.
   - **Description**: airship leads
   - **Execute as**: *Me* (האימייל שלך)
   - **Who has access**: **Anyone**  ← חשוב! אחרת האתר לא יוכל לשלוח.
   - לחץ **Deploy**, אשר את ההרשאות (Authorize access → בחר חשבון → Advanced → Go to … → Allow).
6. העתק את ה-**Web app URL** (מסתיים ב-`/exec`).
7. שלח לי את ה-URL הזה — אני אחבר אותו לאתר ואעלה מחדש.

## בדיקה
- פתח את ה-URL בדפדפן: אמור להחזיר `{"ok":true,...}`.
- אחרי שאחבר אותו, כל שליחה מהטופס תוסיף שורה לגיליון אוטומטית.

## עדכון הקוד בעתיד
אם תשנה את Code.gs, חובה **Deploy → Manage deployments → ערוך → Version: New version → Deploy**
כדי שהשינוי ייכנס לתוקף (אותו URL נשמר).
