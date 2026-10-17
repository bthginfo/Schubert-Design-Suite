# Schubert render worker

The service renders the same immutable design revision used by the studio, SVG, technical PDF and BOM. Blender 4.5.14 LTS is pinned by its official SHA-256. Geometry, camera, lights, seed, sample profile, Blender/kernel versions and approved source hashes are recorded in the returned manifest. Native output is 1440 × 1080 for `preview`, 3840 × 2880 for `final`. CPU Cycles uses 8/16 samples and denoising; no upscaling or invented text is involved.

`Dockerfile.vercel` uses the same runtime and build context (`apps/render-worker`) as `Dockerfile`. The process listens on `PORT` (default 8080). Use a separate Vercel project in the same EU region as the app and database. Configure an execution budget longer than the worker's 480-second timeout and at least four CPU threads for the final profile. The observed Windows CPU smoke took 374.5 seconds for the native final image; this is a measured local reference, not a hosting performance guarantee.

## Configuration and local verification

Required: `RENDER_WORKER_SECRET`, a random service credential of at least 32 characters. For private original models, set `ASSET_GATEWAY_URL` to the exact app endpoint `https://your-app/api/v1/render-assets/read`. This is a deployment setting, never a catalogue URL. The app signs short-lived opaque read tokens with a derived app-only key; the worker receives no app signing key or bucket read/write credential. The app checks the current tenant/legal entity, immutable document version, clean scan, live job lease and fencing token before each 1 MB range. DNS addresses must be public, the TLS connection is pinned to the checked address with the original SNI hostname, and redirects are refused. `ALLOW_LOCAL_ASSET_GATEWAY=1` permits a deliberately configured localhost endpoint only for local development.

Optional: `RENDER_THREADS=4`, `RENDER_CONCURRENCY=1`, `RENDER_TIMEOUT_SECONDS=480`, `BLENDER_BIN=/opt/blender/blender`. A missing service secret or Blender binary returns an unavailable state. Missing licensed original glyphs return `LICENSED_GLYPHS_REQUIRED` for final output; a shop image never becomes replacement manufacturer geometry.

Build and start from the repository root, providing the credential through your environment:

```sh
docker build -t schubert-render apps/render-worker
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --cpus=4 --memory=4g --pids-limit=128 --tmpfs /tmp:rw,noexec,nosuid,size=1g \
  -p 127.0.0.1:8080:8080 -e RENDER_WORKER_SECRET schubert-render
```

The HTTP port needs inbound access from the application. Permit outbound access to the fixed application gateway and `https://vercel.com/api/blob/` for constrained private output uploads. Do not place production database, bucket read/write, AI or mail credentials in this container.

With `RENDER_WORKER_URL=http://127.0.0.1:8080` and the same secret available to the local process:

```sh
pnpm exec tsx scripts/render-smoke.ts preview
pnpm exec tsx scripts/render-smoke.ts final
python -m unittest discover -s apps/render-worker/tests -v
```

The smoke writes only synthetic images/manifests into ignored `work/render-smoke/`. It verifies revision/hash, native resolution, immutable replay, higher-token retry, stale-token rejection and rejection of a different revision under the same job ID. The final profile can take several minutes. Unit tests also verify that every protected pixel, including mask edge pixels, remains bit-for-bit identical after compositing.

## Protocol

`POST /render` requires the service bearer credential and the canonical request produced by `buildRenderRequest(ctx, revision, job)`. The JSON envelope is limited to 4 MB on the application side. Private assets use `sourceRef` tokens, source hash and byte length; original bytes travel in 1 MB ranges. The canonical snapshot hash is checked before building a scene. The worker's job key includes the immutable revision, geometry, profile and original hashes; expiring access tokens are excluded from this identity. SQLite is a local replay/fence cache, while the application's PostgreSQL lease and fenced artifact insertion remain authoritative across replicas and restarts.

The result includes revision ID, content hash, job ID, fencing token, actual pixel size, image/mask hashes, accuracy and manifest hash. `manifestCanonical` preserves the exact UTF-8 JSON hashed by Python, including floating point camera values; the application hashes those bytes and separately checks the parsed manifest.

Production requests include `outputTargets`: two short-lived, server-signed Vercel Blob client capabilities. Each permits one private PNG at exactly `tenant/render-output/job/fence/nonce/{image,mask}.png`, at most 40 MB, no overwrite, no random suffix, and expires before the active job lease. Only the fixed Vercel Blob upload host is called; no callback or arbitrary upload URL is accepted. These capabilities are removed before starting Blender and excluded from the immutable render identity. Even a warm-cache replay uploads to the fresh attempt's targets. The result contains only `imageBlob`/`maskBlob` path, size and hash metadata. The app reads the preissued immutable private paths independently, verifies actual PNG structure, native resolution, SHA-256 and the live PostgreSQL fence, archives canonical document versions, then removes transport objects. A different worker replica can serve the next request without access to the first replica's temporary directory. No multi-megabyte PNG crosses a Vercel Function response.

The standalone local smoke can omit `outputTargets`; inline small PNGs or authenticated `/render/artifact` chunks then use the local SQLite cache. This local test transport is not used by production artifact registration. Local cached results expire after 24 hours; immutable document originals remain in private storage. Actual private transport QA transferred a 6,983,339-byte native 3840×2880 image, verified identical bytes from a separate reader, and confirmed that Vercel rejected foreign paths, wrong MIME, oversize data, expired capabilities and overwrite attempts.

`planning.package` publishes readiness only after the technical PDF, frozen BOM, actual native final PNG, camera/render proof, internal protection mask where needed, manifest and ZIP are archived against the same immutable revision hash. The ZIP also contains canonical plan JSON and three vector SVG views. The final PostgreSQL transaction locks the live job attempt, rechecks its fence and lease, approvals, sources and all archived document versions. A stale attempt cannot publish a package. Model-based neutral material appearance remains explicitly labelled; the ZIP never grants additional rights to private manufacturer originals.

`POST /composite` uses a separate concept job ID/fence, immutable revision/hash, archived original render proof, and three short-lived private references (`originalRef`, `maskRef`, `candidateRef`). It verifies source hashes and the exact camera/native dimensions, then copies all nonzero-mask pixels from the original without blending. It uses the same private output capabilities as `/render`, and can run on a fresh replica with no original render cache. The result is labelled `concept_visualization_with_protected_original_pixels`; concept images cannot satisfy deterministic package readiness. A legacy cache-based call is retained only for the local standalone protocol. An existing photo without a verified projection/mask binding remains unresolved; it never becomes an exact manufacturer glyph model.

## Geometry and limits

Canonical coordinates remain right-handed Z-up mm; Blender uses right-handed Z-up metres. glTF source orientation is undone once after Blender import, followed by the documented asset basis and unit conversion. No model is scaled to make it fit a SKU. External GLB buffers/images, dynamic geometry and unsupported compression are refused at catalogue verification and checked again at render entry. Circular arcs remain analytic in the revision; only the render adapter tessellates them with a declared 0.005 mm chord error. Closed holes, explicit through-cutouts, machining depths, wall openings, material layers and host transformations come from the revision.

Scene adapter `schubert-scene/1.0.3` preserves legacy wall joins when a revision has no explicit join style. Explicit miter joins use shared-node geometry for oblique and T junctions, with actual layer bodies and partial-depth niches. Front/back blind bores, grooves and drip grooves use the declared material depth; miter machining cuts a closed wedge from a straight rectangular workpiece. A freeform miter requires its own reviewed manufacturing geometry and is refused by the parametric wedge tool. Missing opening/depth/layer dimensions remain unresolved.

The render adapter rebases the scene before float conversion and centres each converted curve locally. It budgets half of the 0.005 mm adapter error to arc tessellation and half to numeric welding, records the render origin and numeric budget in the manifest, and rejects a piece too large to meet that budget. This is a rendering error budget, not manufacturing certification. The native 3840 × 2880 acceptance scene for version 1.0.3 completed locally in 367.442 seconds and was visually checked for an oblique/T wall junction, door, backed niche, finishing layers, blind bore, rear drip groove and miter removal. Its source geometry and actual volumes were also checked independently by the geometry tests.

Linear slope endpoints and their host contour use the host's horizontal XY projection. True surface areas and edge lengths use the same plane; layer/stone thickness is normal to it. A different slope region uses a separate host surface. Missing slope endpoints or dimensions block final rendering rather than flattening the model silently. The neutral fallback material is explicitly `model_based`; an actual natural stone pattern requires a rights-cleared texture or the concrete slab photo. This does not manufacture claims about stone grain, exact supplier contours, fastening depths or drilling positions.

The worker permits one concurrent scene by default, a maximum 40 MB original, 80 MB total original bytes, bounded topology and a 480-second process budget. No untrusted startup scripts run (`--factory-startup --disable-autoexec`), and the Blender child receives a minimal environment without service credentials. Errors return safe codes without filenames, document content or opaque access tokens.
