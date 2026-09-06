const express=require('express'),c=require('../controllers/reportController'),{requireAuth,requireRole}=require('../middleware/auth'),r=express.Router();
r.use(requireAuth,requireRole('officer','admin'));
r.get('/',c.list);r.get('/:id',c.get);r.post('/',c.create);r.put('/:id',c.update);r.patch('/:id/submit',c.submit);r.post('/:id/print',c.print);module.exports=r;