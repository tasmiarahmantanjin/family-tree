import { Router } from 'express'
import relationship from '../controllers/relationship'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.use(requireAuth)

router.get('/tree', relationship.getTree)
router.post('/link', relationship.link)
router.post('/unlink', relationship.unlink)

export default router
