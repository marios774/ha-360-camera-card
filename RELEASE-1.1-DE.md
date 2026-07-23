# Version 1.1.0 veröffentlichen

Den Inhalt dieses Ordners in deinen lokalen Repository-Ordner kopieren. Danach:

```bash
npm ci
npm run build
npm test

git add .
git commit -m "Release 1.1.0"
git push origin main

git tag v1.1.0
git push origin v1.1.0
```

Danach GitHub Actions und das Release prüfen. In HACS die neue Version installieren und den Browser-Cache vollständig neu laden.
