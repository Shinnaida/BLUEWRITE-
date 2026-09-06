const service=require('../services/officerService');
const { success,error }=require('../utils/response');
const validId=(value)=>/^\d+$/.test(value)&&Number(value)>0;
const actor=(req)=>req.user.id;
const dbError=(res,err)=>{
  if(err.status)return error(res,err.message,err.status);
  if(err.code==='ER_DUP_ENTRY'){
    const key=String(err.sqlMessage||err.message||'');
    if(key.includes('uq_users_username'))return error(res,'Username is already in use.',409);
    if(key.includes('uq_officers_badge_number'))return error(res,'Badge number is already assigned to another Officer.',409);
    if(key.includes('uq_officers_email'))return error(res,'Email is already assigned to another Officer.',409);
    return error(res,'Username, badge number, or email is already in use.',409);
  }
  return error(res,'Unable to process Officer request.',500);
};
exports.list=async(req,res)=>{try{const out=await service.listOfficers(req.query);return res.status(200).json({success:true,data:out.rows,pagination:out.pagination});}catch(e){return dbError(res,e);}};
exports.get=async(req,res)=>{if(!validId(req.params.id))return error(res,'Invalid Officer ID.',400);try{const row=await service.getOfficer(req.params.id);return row?success(res,row):error(res,'Officer not found.',404);}catch(e){return dbError(res,e);}};
exports.create=async(req,res)=>{
  const body=req.body||{},username=String(body.username||'').trim(),badge=String(body.badge_number||'').trim(),firstName=String(body.first_name||'').trim(),lastName=String(body.last_name||'').trim();
  if(!username)return error(res,'Username is required.',400);
  if(username.length<3||username.length>100)return error(res,'Username must be between 3 and 100 characters.',400);
  if(!/^[a-zA-Z0-9._-]+$/.test(username))return error(res,'Username may contain only letters, numbers, periods, underscores, and hyphens.',400);
  if(!badge)return error(res,'Badge number is required.',400);
  if(badge.length>30)return error(res,'Badge number must not exceed 30 characters.',400);
  if(!firstName)return error(res,'First name is required.',400);
  if(!lastName)return error(res,'Last name is required.',400);
  const email=String(body.email||'').trim().toLowerCase();
  if(!email)return error(res,'Email is required for Officer login verification.',400);
  if(email.length>255||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error(res,'Enter a valid Officer email address.',400);
  if(firstName.length>100||lastName.length>100||String(body.middle_name||'').trim().length>100)return error(res,'Officer names must not exceed 100 characters.',400);
  if(body.status&&!['Active','Disabled','active','disabled'].includes(body.status))return error(res,'Status must be Active or Disabled.',400);
  try{return success(res,await service.createOfficer({...body,username,email,badge_number:badge,first_name:firstName,last_name:lastName},actor(req)),'Officer account created successfully. Save the temporary credentials now; they cannot be displayed again.',201);}catch(e){return dbError(res,e);}
};
exports.update=async(req,res)=>{if(!validId(req.params.id))return error(res,'Invalid Officer ID.',400);const emptied=['badge_number','first_name','last_name','email'].filter(k=>Object.prototype.hasOwnProperty.call(req.body,k)&&!String(req.body[k]||'').trim());if(emptied.length)return error(res,`Fields cannot be empty: ${emptied.join(', ')}.`,400);if(Object.prototype.hasOwnProperty.call(req.body,'email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(req.body.email).trim()))return error(res,'Enter a valid Officer email address.',400);try{const row=await service.updateOfficer(req.params.id,{...req.body,email:req.body.email===undefined?undefined:String(req.body.email).trim().toLowerCase()},actor(req),req.ip);return row?success(res,row,'Officer updated'):error(res,'Officer not found.',404);}catch(e){return dbError(res,e);}};
exports.status=async(req,res)=>{if(!validId(req.params.id))return error(res,'Invalid Officer ID.',400);if(!['Active','Disabled','active','disabled'].includes(req.body.status))return error(res,'Status must be Active or Disabled.',400);try{const row=await service.updateStatus(req.params.id,req.body.status,actor(req),req.ip);return row?success(res,row,'Officer status updated'):error(res,'Officer not found.',404);}catch(e){return dbError(res,e);}};
exports.unlock=async(req,res)=>{if(!validId(req.params.id))return error(res,'Invalid Officer ID.',400);try{const row=await service.unlockOfficer(req.params.id,actor(req),req.ip);return row?success(res,row,'Officer account unlocked successfully.'):error(res,'Officer not found.',404)}catch(e){return dbError(res,e)}};
exports.resetPassword=async(req,res)=>{if(!validId(req.params.id))return error(res,'Invalid Officer ID.',400);try{const result=await service.resetOfficerPassword(req.params.id,actor(req),req.ip);return result?success(res,result,'Temporary password generated. Save it now; it cannot be displayed again.'):error(res,'Officer not found.',404)}catch(e){return dbError(res,e)}};
