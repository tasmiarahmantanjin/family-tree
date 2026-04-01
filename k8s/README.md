# Kubernetes Commands Reference

## Cluster Status

```bash
# Check node status
kubectl get nodes

# Check all pods across all namespaces
kubectl get pods -A

# Check system resources
kubectl top nodes
kubectl top pods
```

## Application Management

```bash
# Check pod status
kubectl get pods

# Check pod logs
kubectl logs -l app=family-tree --tail=50

# Follow logs in real-time
kubectl logs -l app=family-tree -f

# Check pod details and events (useful for debugging)
kubectl describe pod -l app=family-tree

# Check all resources
kubectl get deployment,svc,ingress,certificate
```

## Deploying / Updating

```bash
# Apply manifests
kubectl apply -f deployment.yaml -f service.yaml -f ingress.yaml

# Update image to a specific tag
kubectl set image deployment/family-tree \
  family-tree=rahmantz/family-tree-backend:<tag>

# Restart deployment (pulls latest image)
kubectl rollout restart deployment family-tree

# Watch rollout progress
kubectl rollout status deployment/family-tree

# Rollback to previous version
kubectl rollout undo deployment family-tree

# Check rollout history
kubectl rollout history deployment family-tree
```

## Health Checks

```bash
# Backend health
curl https://api.trlab.dev/health

# Backend readiness (database connection)
curl https://api.trlab.dev/health/ready

# API test
curl https://api.trlab.dev/api/v1/people
```

## Secrets

```bash
# List secrets
kubectl get secrets

# Create database secret
kubectl create secret generic family-tree-secrets \
  --from-literal=DATABASE_URL='postgres://user:pass@host:port/dbname?sslmode=require'

# View secret (base64 encoded)
kubectl get secret family-tree-secrets -o yaml

# Delete and recreate secret (to update)
kubectl delete secret family-tree-secrets
kubectl create secret generic family-tree-secrets \
  --from-literal=DATABASE_URL='new-connection-string'
```

## TLS / Certificates

```bash
# Check certificate status
kubectl get certificate

# Check certificate details
kubectl describe certificate family-tree-tls

# Check ClusterIssuer
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

## Debugging

```bash
# Shell into a running pod
kubectl exec -it deployment/family-tree -- /bin/sh

# Check container environment variables
kubectl exec deployment/family-tree -- env

# Check pod events (image pull errors, crash loops, etc.)
kubectl get events --sort-by='.lastTimestamp'

# Check why a pod is failing
kubectl describe pod <pod-name>

# Check Docker images on the node
crictl images | grep family-tree
```

## Scaling

```bash
# Scale up/down
kubectl scale deployment family-tree --replicas=2

# Check current replicas
kubectl get deployment family-tree
```

## Cleanup

```bash
# Delete all app resources
kubectl delete -f deployment.yaml -f service.yaml -f ingress.yaml

# Delete specific pod (will be recreated by deployment)
kubectl delete pod <pod-name>

# Clean up completed/failed pods
kubectl delete pods --field-selector=status.phase=Failed
```

## VPS Maintenance

```bash
# Check if system restart is required
cat /var/run/reboot-required 2>/dev/null && echo "Reboot needed" || echo "No reboot needed"

# Reboot VPS (K3s auto-restarts, ~1 min downtime)
sudo reboot

# Check K3s service status after reboot
systemctl status k3s

# Check disk usage
df -h /
```
