<script lang="ts">
  import {onMount,untrack} from 'svelte';
  import {refreshAll} from '$app/navigation';
  import {request,RequestError,display} from '#lib/client/api.ts';
  import type {AppData,Row} from '#lib/client/types.ts';
  import Icon from './Icon.svelte';
  import NotificationPreferences from './NotificationPreferences.svelte';
  import AppearanceSettings from './AppearanceSettings.svelte';
  let {data}:{data:AppData}=$props();
  let name=$state(untrack(()=>data.summary?.account?.name||data.user?.name||''));let email=$state(untrack(()=>data.summary?.account?.email||data.user?.email||''));let ready=$state(false);let profilePassword=$state('');let emailConfirmed=$state(false);let busy=$state('');let error=$state('');let notice=$state('');let errors:Record<string,string>=$state({});
  let currentPassword=$state('');let newPassword=$state('');let repeatedPassword=$state('');let sessions:Row[]=$state([]);let sessionsLoaded=$state(false);let currentSessionId=$state('');let revoking:Row|null=$state(null);
  const account=$derived(data.summary?.account||{});
  const emailChanged=$derived(email.trim().toLowerCase()!==(data.user?.email||'').toLowerCase());
  const contactEmail=$derived(account.contactAdminEmail||data.summary?.contactAdminEmail||'');
  onMount(()=>{ready=true;});
  async function saveProfile(event:SubmitEvent){event.preventDefault();if(busy)return;busy='profile';error='';notice='';errors={};try{if(emailChanged&&!emailConfirmed)throw new Error('Bestätigen Sie bitte, dass die neue E-Mail-Adresse Ihnen gehört und erreichbar ist.');await request('/api/v1/reauth',{password:profilePassword});const result=await request('/api/v1/account/profile',{name:name.trim(),email:email.trim()});profilePassword='';if(result.reauthenticate){window.location.assign('/login?profile=updated');return;}notice=result.message||'Ihr persönliches Profil wurde gespeichert.';if(result.user){name=result.user.name;email=result.user.email;}await refreshAll().catch(()=>{});}catch(e){error=e instanceof Error?e.message:'Das Profil konnte nicht gespeichert werden.';if(e instanceof RequestError)errors=e.fields;}finally{busy='';}}
  async function changePassword(event:SubmitEvent){event.preventDefault();if(busy)return;busy='password';error='';notice='';try{if(newPassword!==repeatedPassword)throw new Error('Die beiden neuen Passphrasen stimmen noch nicht überein.');await request('/api/auth/change-password',{currentPassword,newPassword,revokeOtherSessions:true});currentPassword='';newPassword='';repeatedPassword='';sessions=[];sessionsLoaded=false;notice='Die Passphrase wurde geändert. Andere angemeldete Geräte wurden abgemeldet.';}catch(e){error=e instanceof Error?e.message:'Die Passphrase konnte nicht geändert werden.';}finally{busy='';}}
  async function loadSessions(){if(busy)return;busy='sessions';error='';try{const [result,current]=await Promise.all([request('/api/auth/list-sessions',undefined,'GET'),request('/api/auth/get-session',undefined,'GET')]);currentSessionId=current.session?.id||account.currentSessionId||'';sessions=Array.isArray(result)?result:result.sessions||[];sessionsLoaded=true;}catch(e){error=e instanceof Error?e.message:'Die angemeldeten Geräte konnten nicht geladen werden.';}finally{busy='';}}
  async function revoke(){if(!revoking||busy)return;busy='revoke';error='';notice='';try{await request('/api/auth/revoke-session',{token:revoking.token});sessions=sessions.filter(session=>session.id!==revoking?.id);revoking=null;notice='Dieses Gerät wurde abgemeldet. Eine erneute Nutzung erfordert eine persönliche Anmeldung.';}catch(e){error=e instanceof Error?e.message:'Das Gerät konnte nicht abgemeldet werden.';}finally{busy='';}}
  function deviceLabel(agent:string){const browser=/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'Browser';const system=/iPhone|iPad/.test(agent)?'iPhone / iPad':/Android/.test(agent)?'Android':/Windows/.test(agent)?'Windows':/Macintosh/.test(agent)?'Mac':'Gerät';return browser+' · '+system;}
</script>

{#if error}<div class="notice error" role="alert"><Icon name="alert"/><div>{error}</div></div>{/if}
{#if notice}<div class="notice info" role="status"><Icon name="check"/><div>{notice}</div></div>{/if}
<AppearanceSettings {data}/>
<div class="settings-grid">
  <div class="stack">
    <section class="panel"><header class="panel-header"><div><h2>Mein persönliches Profil</h2><p>Ihr eigener Name und Ihre geschäftliche Anmeldung.</p></div><Icon name="users" size={18}/></header>
      <form class="panel-body" onsubmit={saveProfile}>
        <div class="field mb"><label for="profile-name">Vollständiger Name *</label><input id="profile-name" bind:value={name} autocomplete="name" required minlength="2" maxlength="200" aria-invalid={!!errors.name}/><span class="field-help">Dieser Name erscheint bei Ihren Nachrichten, Änderungen und Freigaben.</span>{#if errors.name}<span class="field-error">{errors.name}</span>{/if}</div>
        <div class="field mb"><label for="profile-email">Meine geschäftliche E-Mail *</label><input id="profile-email" type="email" bind:value={email} autocomplete="username" required maxlength="254" aria-invalid={!!errors.email}/><span class="field-help">Verwenden Sie eine Adresse, auf die nur Sie zugreifen. Sie wird für Ihre Anmeldung und Wiederherstellung benötigt.</span>{#if errors.email}<span class="field-error">{errors.email}</span>{/if}</div>
        {#if emailChanged}<div class="notice warning"><Icon name="lock"/><div>Nach dem Ändern der E-Mail werden alle Ihre Geräte abgemeldet. Melden Sie sich danach mit der neuen Adresse und Ihrer bestehenden Passphrase an.</div></div><label class="check-field mb"><input type="checkbox" bind:checked={emailConfirmed} required/><span>Diese neue Adresse gehört mir und ist erreichbar. Ich habe sie geprüft.</span></label>{/if}
        <div class="field"><label for="profile-password">Aktuelle Passphrase bestätigen *</label><input id="profile-password" type="password" bind:value={profilePassword} autocomplete="current-password" required/><span class="field-help">Die zusätzliche Bestätigung schützt Ihre Anmeldedaten. Name und E-Mail werden erst mit „Profil speichern“ geändert.</span></div>
        <button class="btn primary mt" disabled={!ready||!!busy}>{busy==='profile'?'Wird gespeichert …':'Profil speichern'}<Icon name="check" size={16}/></button>
      </form>
    </section>
    <section class="panel"><header class="panel-header"><h2>Passphrase ändern</h2><Icon name="lock" size={18}/></header>
      <form class="panel-body" onsubmit={changePassword}>
        <div class="field mb"><label for="current-password">Aktuelle Passphrase *</label><input id="current-password" type="password" autocomplete="current-password" bind:value={currentPassword} required/></div>
        <div class="field mb"><label for="new-password">Neue Passphrase *</label><input id="new-password" type="password" autocomplete="new-password" bind:value={newPassword} minlength="15" maxlength="128" required/><span class="field-help">Mindestens 15 Zeichen. Eine lange eigene Wortfolge oder ein Passwortmanager hilft.</span></div>
        <div class="field"><label for="repeat-new-password">Neue Passphrase wiederholen *</label><input id="repeat-new-password" type="password" autocomplete="new-password" bind:value={repeatedPassword} minlength="15" maxlength="128" required/><span class="field-help">Andere angemeldete Geräte werden nach der Änderung abgemeldet.</span></div>
        <button class="btn primary mt" disabled={!ready||!!busy}>{busy==='password'?'Wird geändert …':'Passphrase ändern'}</button>
      </form>
    </section>
  </div>
  <aside class="stack">
    <section class="panel"><header class="panel-header"><h2>Ihre Ansprechperson</h2></header><div class="panel-body"><p class="small">Die zuständige Administration hilft bei fehlenden Zugängen, Berechtigungen und der Einrichtung.</p>{#if contactEmail}<a class="text-link mt" href={'mailto:'+encodeURIComponent(contactEmail)}><Icon name="mail" size={16}/>{contactEmail}</a><p class="field-help mt">Öffnet Ihr E-Mail-Programm. Es wird keine Nachricht automatisch gesendet.</p>{:else}<p class="field-help mt">Eine Kontaktadresse wurde für diesen Betrieb noch nicht hinterlegt. Wenden Sie sich an Ihre betriebliche Ansprechperson.</p>{/if}</div></section>
    <section class="panel"><header class="panel-header"><div><h2>Angemeldete Geräte</h2><p>Prüfen Sie, wo Ihr Zugang genutzt wird.</p></div></header><div class="panel-body"><button class="btn" disabled={!ready||!!busy} onclick={loadSessions}><Icon name="refresh" size={15} class={busy==='sessions'?'spin':''}/>{busy==='sessions'?'Wird geladen …':sessionsLoaded?'Liste aktualisieren':'Geräte anzeigen'}</button>
      {#each sessions as session}<div class="account-session"><div><h3>{deviceLabel(session.userAgent||session.user_agent||'')}</h3><p class="field-help mt">Zuletzt aktiv {display(session.updatedAt||session.updated_at,'updated_at')}</p>{#if session.id===currentSessionId}<p class="field-help">Ihr aktuelles Gerät</p>{/if}</div>{#if session.id!==currentSessionId}<button class="btn small mt" disabled={!ready||!!busy} onclick={()=>revoking=session}>Dieses Gerät abmelden</button>{/if}</div>{/each}
      {#if !sessions.length}<p class="small mt">{sessionsLoaded?'Keine weiteren Sitzungen gemeldet.':'Die Liste wird nur auf Ihren Wunsch geladen.'}</p>{/if}
      {#if revoking}<div class="action-preview mt"><h3>{deviceLabel(revoking.userAgent||revoking.user_agent||'')} abmelden?</h3><p class="small mt">Auf diesem Gerät muss sich die Person danach erneut anmelden.</p><div class="inline-actions mt"><button class="btn" disabled={!ready||!!busy} onclick={()=>revoking=null}>Zurück</button><button class="btn danger" disabled={!ready||!!busy} onclick={revoke}>Gerät abmelden</button></div></div>{/if}
    </div></section>
  </aside>
</div>
<NotificationPreferences {data}/>
<style>.account-session{border-top:1px solid var(--line);margin-top:22px;padding-top:22px}.account-session h3{font-size:14px;font-weight:500}.account-session .mt.field-help{margin-top:9px}</style>
