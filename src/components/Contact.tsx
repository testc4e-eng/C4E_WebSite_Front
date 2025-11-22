// ============================================================
// Fichier : /components/Contact.tsx - VERSION CORRIGÉE
// ============================================================
import { MapPin, Phone, Mail, Clock, Facebook, Linkedin, Send } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Configuration de l'API
const API_BASE_URL = 'https://c4e-website-back.onrender.com'; 

// ------------------------------------------------------------
// Composant popup moderne affiché après succès de l'envoi
// ------------------------------------------------------------
const SuccessPopup = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      className="fixed top-5 right-5 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      <div className="font-semibold">{message}</div>
    </motion.div>
  );
};

// ------------------------------------------------------------
// Composant principal : Contact
// ------------------------------------------------------------
const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // CORRECTION : Utilisation de l'URL Render
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Envoi du message vers:', `${API_BASE_URL}/contact`);
      
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowSuccess(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
        console.log('✅ Message envoyé avec succès');
      } else {
        const errorData = await res.json();
        console.error('❌ Erreur serveur:', errorData);
        alert("Erreur lors de l'envoi du message: " + (errorData.error || 'Erreur serveur'));
      }
    } catch (err) {
      console.error('❌ Erreur réseau:', err);
      alert("Erreur de connexion au serveur. Vérifiez votre connexion internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    const map = L.map('mapid').setView([33.59277, -7.63177], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const logoIcon = L.icon({
      iconUrl: '/logo.png',
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50]
    });

    L.marker([33.59277, -7.63177], { icon: logoIcon })
      .addTo(map)
      .bindPopup('75 Boulevard d\'Anfa, Casablanca, Maroc')
      .openPopup();

    return (): void => {
      map.remove();
    };
  }, []);

  return (
    <section id="contact" className="scroll-mt-20 py-20 bg-secondary/30 relative">
      {showSuccess && <SuccessPopup message="Message envoyé avec succès !" onClose={() => setShowSuccess(false)} />}
      
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Contactez-<span className="text-gradient-accent">nous</span>
          </motion.h2>
          <motion.p 
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Prêt à transformer vos idées en solutions durables ? Contactez nos experts dès aujourd'hui
          </motion.p>
          <motion.div 
            className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mt-8 rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Colonne gauche : Informations de contact + carte */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-8">Nous Contacter</h3>
            <div className="space-y-6 mb-8">
              <ContactInfo icon={<MapPin className="h-6 w-6 text-white" />} title="Adresse" text="75 Boulevard d'Anfa, Casablanca, Maroc" color="bg-gradient-accent" />
              <ContactInfo icon={<Phone className="h-6 w-6 text-white" />} title="Téléphone" text="+212 522229877" color="bg-gradient-accent" />
              <ContactInfo icon={<Mail className="h-6 w-6 text-white" />} title="Email" text="c4e.africa@gmail.com  /  rhc4eafrica@gmail.com" color="bg-gradient-accent" />
              <ContactInfo icon={<Clock className="h-6 w-6 text-white" />} title="Horaires" text="Lun-Ven 8h-18h" color="bg-gradient-accent" />
              <ContactInfo icon={<Facebook className="h-6 w-6 text-white" />} title="Facebook" text="https://www.facebook.com/C4EAFRICA" color="bg-blue-600" link />
              <ContactInfo icon={<Linkedin className="h-6 w-6 text-white" />} title="LinkedIn" text="https://www.linkedin.com/company/c4e-africa" color="bg-blue-500" link />
            </div>

            <motion.div 
              className="bg-gradient-ocean rounded-2xl h-64 overflow-hidden shadow-lg"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div id="mapid" className="h-full w-full"></div>
            </motion.div>
          </motion.div>

          {/* Colonne droite : Formulaire de contact */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <h3 className="text-2xl font-bold text-foreground mb-6">Envoyez-nous un message</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    placeholder="Prénom *" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300"
                  />
                  <input 
                    type="text" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    placeholder="Nom *" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300"
                  />
                </div>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="Email *" 
                  required 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300"
                />
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="Téléphone" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300"
                />
                <select 
                  name="subject" 
                  value={formData.subject} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300"
                >
                  <option value="">Sélectionnez un sujet</option>
                  <option value="eau">Projets Eau</option>
                  <option value="energie">Projets Énergie</option>
                  <option value="environnement">Projets Environnement</option>
                  <option value="education">Projets Éducation</option>
                  <option value="partenariat">Partenariat</option>
                  <option value="autre">Autre</option>
                </select>
                <textarea 
                  name="message" 
                  value={formData.message} 
                  onChange={handleChange} 
                  placeholder="Message *" 
                  required 
                  rows={5} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-300 resize-none"
                ></textarea>
                <motion.button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full bg-gradient-to-r from-accent to-primary text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" /> Envoyer le message
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;

// Sous-composant ContactInfo (inchangé)
const ContactInfo = ({ icon, title, text, color, link }: { icon: React.ReactNode; title: string; text: string; color: string; link?: boolean }) => (
  <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
    <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      {link ? (
        <a href={text} className="text-accent hover:text-accent-dark transition-colors duration-300 break-all" target="_blank" rel="noreferrer">
          {text}
        </a>
      ) : (
        <p className="text-muted-foreground">{text}</p>
      )}
    </div>
  </div>
);