import { Router } from 'express'
import people from '../controllers/people'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.use(requireAuth)

router.get('/', people.getAll)
router.post('/', people.create)
router.put('/:id', people.update)
router.delete('/:id', people.delete)

export default router
