import { notFound } from 'next/navigation';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
    // Feature disabled as FileShare model is removed
    notFound();
}
