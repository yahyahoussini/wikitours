import { createLegalPage } from '@/lib/legal-page';

export const revalidate = false;

const { generateMetadata, LegalPage } = createLegalPage('politique-de-confidentialite');
export { generateMetadata };
export default LegalPage;
