import { Router } from 'express'
import relationship from '../controllers/relationship'

const router = Router()

router.get('/tree', relationship.getTree)
router.post('/link', relationship.link)
router.post('/unlink', relationship.unlink)

export default router
