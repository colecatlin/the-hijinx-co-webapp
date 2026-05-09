import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Storefront admin now lives in ManageHomepage > Storefront tab
export default function StorefrontAdmin() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/ManageHomepage?tab=storefront', { replace: true });
  }, []);
  return null;
}