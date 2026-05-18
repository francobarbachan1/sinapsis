# Deploy en VPS + dominio Hostinger

Guía paso a paso para publicar Sinapsis en tu VPS (Ubuntu/Debian) sirviendo el
sitio con **nginx**, apuntando un dominio (o subdominio) de **Hostinger** y
asegurando con **HTTPS via Let's Encrypt**.

Tiempo estimado total: ~20 minutos la primera vez. Después, cada deploy nuevo
es 1 minuto (rsync + reload).

> Convenciones de esta guía:
> - `tu-dominio.com` → reemplazar por tu dominio real (o subdominio:
>   `sinapsis.tu-dominio.com`)
> - `usuario@vps` → tu usuario SSH y la IP/hostname del VPS
> - Comandos con `sudo` van en el VPS; el resto se ejecuta en tu máquina local.

---

## 0. Pre-requisitos

- Cuenta SSH en el VPS (Hostinger te muestra IP + usuario + clave en su panel).
- Dominio o subdominio comprado/gestionado por vos en Hostinger.
- En tu máquina local: `git`, `rsync` o `scp` instalados (en Windows hay
  `rsync` para WSL; alternativa: `scp` con OpenSSH viene en Windows 10+).

---

## 1. Apuntar el dominio al VPS (DNS)

En el **panel de Hostinger → Dominios → Tu dominio → DNS / Nameservers**:

1. Agregar (o editar) un registro **A**:
   - Tipo: `A`
   - Nombre: `@` (raíz del dominio) o `sinapsis` (para `sinapsis.tu-dominio.com`)
   - Apunta a: **IP pública de tu VPS**
   - TTL: dejar el default (3600).
2. Para `www`, agregar otro **A** con nombre `www` apuntando a la misma IP, o
   un **CNAME** `www` apuntando a `@`.

Propagación: 5–30 minutos en general. Verificá con:

```bash
dig +short tu-dominio.com
# debería responder con la IP de tu VPS
```

---

## 2. Setup del VPS (una vez sola)

SSH al VPS:

```bash
ssh usuario@vps
```

Instalar nginx (si no está) y herramientas de SSL:

```bash
sudo apt update
sudo apt install -y nginx ufw
```

(Opcional) abrir el firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

Crear la carpeta donde va a vivir el sitio:

```bash
sudo mkdir -p /var/www/sinapsis
sudo chown -R $USER:$USER /var/www/sinapsis
```

---

## 3. Configurar nginx

Crear `/etc/nginx/sites-available/sinapsis`:

```bash
sudo nano /etc/nginx/sites-available/sinapsis
```

Pegar:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /var/www/sinapsis;
    index index.html;

    # Compresión para archivos de texto
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    # Routing simple: siempre fallback a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache largo para audio e imágenes (assets que casi nunca cambian)
    location ~* \.(wav|mp3|ogg|png|jpg|jpeg|svg|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache moderado para JS y CSS
    location ~* \.(js|css)$ {
        expires 1d;
        add_header Cache-Control "public";
    }

    # No cachear el HTML (para que los cambios se vean al instante)
    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
        expires 0;
    }

    # Ocultar dotfiles (.git, .nojekyll, etc.) excepto los que querés exponer
    location ~ /\. {
        deny all;
    }
}
```

Habilitar el site y validar:

```bash
sudo ln -s /etc/nginx/sites-available/sinapsis /etc/nginx/sites-enabled/
# Opcional: deshabilitar el "default" de nginx si no lo necesitás:
# sudo rm /etc/nginx/sites-enabled/default

sudo nginx -t                 # debe decir "syntax is ok" y "test is successful"
sudo systemctl reload nginx
```

---

## 4. Subir los archivos del proyecto

Desde **tu máquina local**, parado en la raíz del repo `sinapsis/`:

```bash
rsync -avz --delete \
    --exclude '.git' \
    --exclude '.claude' \
    --exclude 'deploy' \
    --exclude 'tools' \
    --exclude '*.md' \
    ./ usuario@vps:/var/www/sinapsis/
```

> `--delete` borra del VPS lo que no esté en local — útil para mantener limpio.
> Sacarlo si querés ser conservador.

Las exclusiones quitan archivos que no necesitás en producción (la spec, los
README, el server local PowerShell, etc.). Lo que llega al VPS:
`index.html`, `.nojekyll`, `src/`, `assets/`.

Permisos:

```bash
ssh usuario@vps 'sudo chown -R www-data:www-data /var/www/sinapsis'
```

Probar HTTP (sin TLS todavía): `http://tu-dominio.com/` en el navegador.
Debería levantar el juego.

---

## 5. HTTPS con Let's Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot pide un email, acepta T&C, y te pregunta si querés redirigir HTTP → HTTPS.
Decí que sí.

El renew es automático via systemd timer. Verificar:

```bash
sudo systemctl status certbot.timer
```

Probar HTTPS: `https://tu-dominio.com/` en el navegador.

---

## 6. Deploys siguientes

Después del setup inicial, cada cambio que querés publicar es:

```bash
# En tu máquina local, parado en sinapsis/:
rsync -avz --delete \
    --exclude '.git' --exclude '.claude' --exclude 'deploy' \
    --exclude 'tools' --exclude '*.md' \
    ./ usuario@vps:/var/www/sinapsis/

ssh usuario@vps 'sudo chown -R www-data:www-data /var/www/sinapsis'
```

Como nginx sólo sirve archivos estáticos, **no hace falta reload**. El cambio
es instantáneo (excepto por el cache de los browsers, pero `Cache-Control: no-store`
en `index.html` evita ese problema para los archivos críticos).

---

## 7. Script de deploy (opcional)

Para no repetir el `rsync` a mano, podés crear `deploy/upload.sh` en tu local:

```bash
#!/usr/bin/env bash
set -e
HOST="usuario@vps"
DEST="/var/www/sinapsis"
rsync -avz --delete \
    --exclude '.git' --exclude '.claude' --exclude 'deploy' \
    --exclude 'tools' --exclude '*.md' \
    ./ "$HOST:$DEST/"
ssh "$HOST" "sudo chown -R www-data:www-data $DEST"
echo "Deploy hecho."
```

`chmod +x deploy/upload.sh` y después corrés `./deploy/upload.sh` desde la
raíz del proyecto cada vez.

---

## Troubleshooting

- **"403 Forbidden"** en el navegador: revisar permisos. La carpeta debe ser
  legible por `www-data`. `sudo chown -R www-data:www-data /var/www/sinapsis`.
- **Audio no suena**: en HTTPS Chrome requiere interacción del usuario antes
  de habilitar el audio. El juego maneja esto automáticamente (suena después
  del primer click en Comenzar).
- **DNS no propaga**: esperar más, o probar con `dig` desde otro DNS:
  `dig @8.8.8.8 tu-dominio.com`.
- **MIME types incorrectos**: nginx detecta WAV/MP3/OGG por extensión sin
  config extra. Si no suena, verificar en DevTools → Network que los archivos
  vuelvan con `Content-Type: audio/wav` (o similar).
- **404 en `/src/main.js`**: indicar que la carpeta `src/` no se copió. Revisar
  que el `rsync` haya transferido el subárbol completo.

---

## Otras opciones de hosting

Si querés sortear el VPS:

- **GitHub Pages**: ya está soportado por el código (`.nojekyll` incluido).
  Push a un repo público, **Settings → Pages → Source: main / root**, y queda
  en `https://<usuario>.github.io/<repo>/`. URL no personalizada (pero podés
  configurar dominio custom si querés).
- **Hostinger Web Hosting** (no el VPS — el plan de hosting compartido): sube
  los archivos por File Manager o FTP a `public_html/`. Más simple que VPS,
  menos control.
- **Cloudflare Pages / Vercel / Netlify**: drag-and-drop del repo, deploy
  automático con cada push. Tier gratuito alcanza para Sinapsis.
