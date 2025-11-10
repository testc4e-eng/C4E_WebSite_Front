// ============================================================
// Fichier : /components/Contact.tsx
// Description : Composant React "Contact".
// - Affiche les informations de contact (adresse, téléphone, email, réseaux sociaux)
// - Affiche une carte Leaflet avec localisation
// - Contient un formulaire de contact relié au backend (POST /contact)
// - Affiche un popup de succès après envoi
// ============================================================

import { MapPin, Phone, Mail, Clock, Facebook, Linkedin, Send } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// ------------------------------------------------------------
// Composant popup moderne affiché après succès de l’envoi
// ------------------------------------------------------------
const SuccessPopup = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // auto-fermeture après 3 sec
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 animate-fadeIn">
      <div className="font-semibold">{message}</div>
    </div>
  );
};

// ------------------------------------------------------------
// Composant principal : Contact
// ------------------------------------------------------------
const Contact = () => {
  // États du formulaire
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false); // contrôle du popup succès

  // Gestion des changements de champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Soumission du formulaire (POST vers backend Node.js)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowSuccess(true); // Affiche le popup
        // Réinitialise le formulaire
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
      } else {
        alert("Erreur lors de l'envoi du message.");
      }
    } catch (err) {
      alert("Erreur lors de l'envoi du message.");
    }
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    const map = L.map('mapid').setView([33.59277, -7.63177], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Icône personnalisée (logo)
    const logoIcon = L.icon({
      iconUrl: '/logo.png',
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50]
    });

    // Marqueur avec popup d’adresse
    L.marker([33.59277, -7.63177], { icon: logoIcon })
      .addTo(map)
      .bindPopup('75 Boulevard d’Anfa, Casablanca, Maroc')
      .openPopup();

    // Nettoyage à la destruction du composant
    return (): void => {
      map.remove();
    };
  }, []);

  // ------------------------------------------------------------
  // Rendu du composant
  // ------------------------------------------------------------
  return (
    <section id="contact" className="py-20 bg-secondary/30 relative">
      {/* Popup de succès (affiché après envoi) */}
      {showSuccess && <SuccessPopup message="Message envoyé avec succès !" onClose={() => setShowSuccess(false)} />}
      
      <div className="container mx-auto px-6">
        {/* Titre section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Contactez-<span className="text-gradient-accent">nous</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Prêt à transformer vos idées en solutions durables ? Contactez nos experts dès aujourd'hui
          </p>
        </div>

        {/* Grille : Infos de contact + Formulaire */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* ------------------------------------------------------------
              Colonne gauche : Informations de contact + carte
          ------------------------------------------------------------ */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-8">Nous Contacter</h3>
            <div className="space-y-6 mb-8">
              <ContactInfo icon={<MapPin className="h-6 w-6 text-white" />} title="Adresse" text="75 Boulevard d’Anfa, Casablanca, Maroc" color="bg-gradient-accent" />
              <ContactInfo icon={<Phone className="h-6 w-6 text-white" />} title="Téléphone" text="+212 522229877" color="bg-gradient-accent" />
              <ContactInfo icon={<Mail className="h-6 w-6 text-white" />} title="Email" text="C4E@gmail.com" color="bg-gradient-accent" />
              <ContactInfo icon={<Clock className="h-6 w-6 text-white" />} title="Horaires" text="Lun-Ven 8h-18h" color="bg-gradient-accent" />
              <ContactInfo icon={<Facebook className="h-6 w-6 text-white" />} title="Facebook" text="https://www.facebook.com/C4EAFRICA" color="bg-blue-600" link />
              <ContactInfo icon={<Linkedin className="h-6 w-6 text-white" />} title="LinkedIn" text="https://www.linkedin.com/company/c4e-africa" color="bg-blue-500" link />
            </div>

            {/* Carte Leaflet */}
            <div className="bg-gradient-ocean rounded-2xl h-64 overflow-hidden">
              <div id="mapid" className="h-full w-full"></div>
            </div>
          </div>

          {/* ------------------------------------------------------------
              Colonne droite : Formulaire de contact
          ------------------------------------------------------------ */}
          <div>
            <div className="card-elevated p-8">
              <h3 className="text-2xl font-bold text-foreground mb-6">Envoyez-nous un message</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Champs prénom + nom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Prénom *" required className="w-full px-4 py-3 border rounded-lg" />
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Nom *" required className="w-full px-4 py-3 border rounded-lg" />
                </div>
                {/* Email */}
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email *" required className="w-full px-4 py-3 border rounded-lg" />
                {/* Téléphone */}
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Téléphone" className="w-full px-4 py-3 border rounded-lg" />
                {/* Sujet */}
                <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-3 border rounded-lg">
                  <option value="">Sélectionnez un sujet</option>
                  <option value="eau">Projets Eau</option>
                  <option value="energie">Projets Énergie</option>
                  <option value="environnement">Projets Environnement</option>
                  <option value="education">Projets Éducation</option>
                  <option value="partenariat">Partenariat</option>
                  <option value="autre">Autre</option>
                </select>
                {/* Message */}
                <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Message *" required rows={5} className="w-full px-4 py-3 border rounded-lg"></textarea>
                {/* Bouton d’envoi */}
                <button type="submit" className="w-full btn-hero flex items-center justify-center">
                  <Send className="mr-2 h-5 w-5" /> Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;

// ------------------------------------------------------------
// Sous-composant : ContactInfo
// Affiche une ligne d’information (icône + titre + texte ou lien)
// ------------------------------------------------------------
const ContactInfo = ({ icon, title, text, color, link }: { icon: React.ReactNode; title: string; text: string; color: string; link?: boolean }) => (
  <div className="flex items-start space-x-4">
    <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center`}>{icon}</div>
    <div>
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      {link ? <a href={text} className="text-accent hover:text-accent-dark" target="_blank" rel="noreferrer">{text}</a> : <p className="text-muted-foreground">{text}</p>}
    </div>
  </div>
);
