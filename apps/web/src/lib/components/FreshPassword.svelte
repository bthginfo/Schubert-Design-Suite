<script lang="ts">
 import {request} from '#lib/client/api.ts';
 let {confirmed=$bindable(false)}:{confirmed?:boolean}=$props();
 let password=$state(''),busy=$state(false),error=$state('');
 const id=$props.id();
 async function verify(){if(busy||!password)return;busy=true;error='';try{await request('/api/v1/reauth',{password});password='';confirmed=true;}catch(e){confirmed=false;error=e instanceof Error?e.message:'Passwortbestätigung nicht möglich.';}finally{busy=false;}}
</script>
<div class="fresh-password">{#if confirmed}<p class="field-help" role="status">Ihr persönlicher Zugang wurde für diesen sensiblen Schritt bestätigt.</p>{:else}<label for={id}>Ihr eigenes Suite-Passwort bestätigen</label><div><input {id} type="password" autocomplete="current-password" bind:value={password} oninput={()=>confirmed=false} onkeydown={(e)=>{if(e.key==='Enter'){e.preventDefault();verify();}}}/><button class="btn" type="button" disabled={busy||!password} onclick={verify}>{busy?'Wird geprüft …':'Passwort bestätigen'}</button></div>{/if}{#if error}<p class="field-error" role="alert">{error}</p>{/if}</div>
<style>.fresh-password>label{display:block;margin-bottom:8px}.fresh-password>div{display:flex;gap:12px}.fresh-password input{min-width:0;flex:1}@media(max-width:650px){.fresh-password>div{flex-wrap:wrap}.fresh-password input{flex-basis:100%}}</style>
