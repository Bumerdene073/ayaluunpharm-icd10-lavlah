# ICD‑10 оношийн лавлах + админ (Cloudflare Pages / D1 / Access)

## Энэ хувилбарт юу багтсан бэ?

- Нийтийн лавлах: өмнөх 9 ангиллын дизайн, 36 бүтээгдэхүүн, 83 сонгомол оношийн мөр.
- `https://icd10.kenko.mn/admin/`: админ самбар.
- Админ: гарчиг, тайлбар, үндсэн өнгө; 9 ангиллын нэр, icon, өнгө; эмийн нэр, ангилал, зурагт заасан хуудас, HTTPS зааврын URL; ICD‑10 код, нэр, бүлэг, тайлбар, холбогдох эмүүдийг нэмэх, засах, устгах.
- `Өөрчлөлт нийтлэх` дармагц D1 хадгална, нийтийн сайт дахин нээхэд шинэчилсэн мэдээлэл харагдана. GitHub-д дахин push хийх шаардлагагүй.
- Өөрчлөлтийн түүх (хувилбар, хэн, хэзээ). Автомат rollback UI байхгүй.
- Дүрсийг солих боломжтой боловч шинэ зураг файл upload хийх, чөлөөт drag-and-drop page editor **одоохондоо байхгүй**. Энэ нь тусдаа хөгжүүлэлт шаарддаг.

## Файлын бүтэц

```
public/
  index.html                   # Нийтийн лавлах
  admin/index.html             # Админ интерфэйс
  favicon.svg
  _routes.json                # Pages Functions route limits
  _headers
functions/
  api/content.js              # Нийтийн зөвхөн унших API
  admin/api/content.js        # Зөвшөөрөлтэй GET/PUT
  admin/api/history.js        # Өөрчлөлтийн түүх
  _lib/*                      # JWT/D1/validation
  _lib/initial.js             # Эх өгөгдөл (автоматаар D1 рүү оруулна)
data/icd10_reference_snapshot.json
 database/seed.sql            # Онцгой үед гараар сэргээх нөөц init SQL
README.md
DEPLOY_GUIDE_MN.md
```

## 1. GitHub

1. ZIP-ийг компьютер дээр **задална**.
2. https://github.com/new → `emchiin-icd10-lavlah` → Create repository.
3. `Add file` → `Upload files` → задласан хавтас **доторх** `public`, `functions`, `data`, `database`, README болон DEPLOY_GUIDE_MN.md-ийг бүхлээр нь оруулна.
4. `Commit changes`. Репозиторийн root дээр `public/` болон `functions/` зэрэгцэн байрласан эсэхийг шалгана.
5. Хэрэв хуучин GitHub repository-д сайт нь аль хэдийн байгаа бол түүний файлуудыг шинэ багцынхаар солино. Хуучин deploy-ийг устгах шаардлагагүй, GitHub холбоотой бол push нь шинэчлэнэ.

**Чухал:** Өмнө Pages-д файлаа гараар `Direct Upload` хийсэн бол тэр төсөлд Git интеграц шууд нэмэх боломжгүй. Git холбоотой **шинэ Pages төсөл** үүсгээд дараа нь custom domain-оо шилжүүлнэ. https://developers.cloudflare.com/pages/get-started/direct-upload/

## 2. Pages үүсгэх

- https://dash.cloudflare.com/ → Workers & Pages → Create → **Pages** → Connect to Git → GitHub → repository сонгоно.
- Project name: `emchiin-icd10-lavlah`
- Branch: `main`
- Framework: `None`
- Build command: **хоосон**
- Build output directory: `public`
- Root directory: repository root буюу `.`
- Deploy.

Энэ алхмын дараа `https://emchiin-icd10-lavlah.pages.dev` (өөр нэртэй байж болно) нээгдэнэ. Гэхдээ D1 тохируулах хүртэл хуучин лавлахын эх өгөгдлийг түр харуулна, админ хадгалалт ажиллахгүй.

## 3. D1 холбоно

1. Cloudflare → `Storage & databases` → `D1 SQL Database` → Create.
2. Database name: `icd10-lavlah`.
3. Workers & Pages → таны Pages project → Settings → **Bindings** → Add → `D1 database`.
4. Variable name **яг** `DB` (том үсгээр).
5. Database: `icd10-lavlah`.
6. Production-д тохируулж Save, дараа нь Pages project дээр **Redeploy**.

**Таблиц, 9 ангилал, 36 бүтээгдэхүүн, 83 оношийн мөрийг анхны API хүсэлт дээр автоматаар үүсгэнэ.** `database/seed.sql`-ийг ердийн үед ажиллуулах шаардлагагүй. Нэгэнт D1-д засвар хийгдсэн мэдээллийг GitHub эх JSON шинэчлэгдэхэд дарахгүй.

`https://<project>.pages.dev/api/content` хаяг дээр `categories`, `products`, `diagnoses`, `settings` агуулсан JSON харагдвал D1 холбогджээ.

## 4. Өөрийн дэд домэйн

Pages project → `Custom domains` → Set up → `icd10.kenko.mn`.

`kenko.mn`-ийн DNS Cloudflare дээр байгаа бол Cloudflare DNS автоматаар зааж өгч болно. Үгүй бол DNS-д `CNAME` `icd10` → таны жинхэнэ `project.pages.dev` hostname-г заана. Хүссэн hostname таных гэдгийг баталгаажуулах шаардлагатай.

## 5. Cloudflare Access админ хамгаалалт

1. Cloudflare → **Zero Trust** → Access controls → Applications → Add application → `Self-hosted`.
2. Application name: `ICD10 Admin`.
3. Domain: `icd10.kenko.mn`, Path: `/admin/*` (админ HTML ба `/admin/api/*` хоёуланг хамрах ёстой).
4. Policy action `Allow` → Include → `Emails` → зөвхөн **өөрийн** админ имэйл.
5. Хэрэв PIN-р нэвтрэх бол Access-ийн `One-time PIN` authentication method тохируулах. Нээлттэй Everyone rule нэмж **болохгүй**.
6. Application-ийн `AUD tag`-ийг хуулж авна.
7. Zero Trust Settings хэсгээс **Team domain** (жишээ `myteam.cloudflareaccess.com`)-ийг харна.

## 6. Pages environment variables

Workers & Pages → Pages project → Settings → Environment variables (Production) хэсэгт:

| Variable | Value |
|--|--|
| `ADMIN_EMAIL` | `your-admin-email@example.com` — Access policy-д зөвшөөрсөн **яг тэр имэйл** |
| `CF_ACCESS_TEAM_DOMAIN` | `myteam.cloudflareaccess.com` — танай Cloudflare Zero Trust team domain |
| `CF_ACCESS_AUD` | Access app-ийн `Application Audience (AUD) Tag` |

И-мэйл, team-domain, AUD-ийн жишээ утгыг шууд хуулахгүй. **Өөрийнхөө** утгаар солино. Тохиргоо нэмсний дараа Pages → Deployments → Redeploy.

Энэ төсөл нууц үг хадгалдаггүй. Admin API нь Cloudflare Access JWT-ийн RS256 гарын үсэг, issuer, audience, expiry, мөн `ADMIN_EMAIL`-ийг **сервер талд** баталгаажуулна. JWT тохируулагдаагүй бол админ API нээгдэхгүй.

## 7. Шалгах

- Нийтийн: `https://icd10.kenko.mn/` → 9 ангилал, I10 хайлт.
- Админ: `https://icd10.kenko.mn/admin/` → Cloudflare Access имэйлээр нэвтэрнэ.
- `Эмийн бүтээгдэхүүн` → жишээлбэл `Телмисартан` → HTTPS URL шинэчилнэ.
- `Өөрчлөлт нийтлэх` → нийтийн сайтыг Refresh → зааврын холбоос шинэчлэгдсэн эсэхийг харна.
- `Өөрчлөлтийн түүх` → хувилбар, админы имэйл харагдана.
- Өөр имэйл / incognito window ашиглан `/admin/` нэвтрэх боломжгүйг шалгана.

### Түгээмэл алдаа

- **`503 D1 ...`**: Pages binding нэр `DB` мөн үү; Production binding нэмсэн үү; шинэчилсний дараа redeploy хийсэн үү?
- **`503 Админ хамгаалалт ...`**: `ADMIN_EMAIL`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` гурвыг тохируулна.
- **`401`**: Access-аар нэвтрээгүй, эсвэл `pages.dev/admin/` нээсэн (Access зөвхөн custom domain path-г хамгаална). Админ URL-г custom domain-оор нээнэ.
- **`403`**: Access-ийн policy-д орсон email `ADMIN_EMAIL`-тэй таарахгүй.
- **`409`**: Өөр админ шинэ хувилбар хадгалсан. Хуудсыг ачаалж дахин засварлана.
- **`404` API**: `functions/` хавтас repository root дээр байгаа эсэх, Pages build output `public` эсэх, deployment Git connected эсэхийг шалгана.

### Аюулгүй байдал ба эмнэлзүйн шалгалт

- Үйлчлүүлэгч/өвчтөний хувийн мэдээлэл хадгалах зориулалтгүй.
- Эм–оношийн холбоо нь жорлох автомат зөвлөмж биш; үйлдвэрлэгчийн баталгаажсан заалт, эмчийн хяналтаар баталгаажуулна.
- GitHub-д API token, Cloudflare cookie, нууц үг, private key бүү оруул.
- Эхний хувилбарын түүх нь хэн/хэзээ/хувилбар гэсэн **audit metadata** хадгална; бүрэн diff/rollback биш.
