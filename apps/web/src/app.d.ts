import type {ActorContext} from '@schubert/contracts';
declare global {namespace App {interface Locals {user:{id:string;name:string;email:string}|null;session:{id:string;expiresAt:Date;createdAt:Date}|null;context:ActorContext|null;correlationId:string;}interface Error {message:string;status:number;correlationId?:string;}}}
export {};
