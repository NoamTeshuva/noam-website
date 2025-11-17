import React from 'react';
import { Github, Linkedin, Mail, ExternalLink, FileText, Phone } from 'lucide-react';

const Portfolio = () => {
  // Image path pointing to public folder

  const personalInfo = {
    name: "Noam Teshuva",
    title: "B.Sc. in Computer Science and Mathematics",
    about: `
      I'm a passionate developer with a strong foundation in computer science and mathematics. 
      I have hands-on experience with Python, Java, C, and JavaScript, and I'm proficient in frameworks like React.js and tools like PyTorch for deep learning. 
      My skill set includes data analysis, machine learning, and backend development with cloud technologies such as AWS and Docker. 
      I'm capable of handling both frontend and backend tasks, building end-to-end systems, and delivering impactful data insights.
    `,
    github: "https://github.com/NoamTeshuva",
    linkedin: "https://www.linkedin.com/in/noam-teshuva-452101221",
    email: "Teshuva91@gmail.com",
    phone: "054-2433401",
    resume: "/NoamTeshuvaResume.pdf",
    photo: "/profile-photo.png"
  };
  

  return (
    <div className="min-h-screen bg-gray-50">
 {/* Navigation */}
<nav className="bg-white shadow-sm">
  <div className="max-w-5xl mx-auto px-4 py-4">
    <div className="flex justify-between items-center">
      <h1 className="text-xl font-bold text-gray-800">{personalInfo.name}</h1>
      <div className="space-x-4">
        <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
        <a href="#projects" className="text-gray-600 hover:text-gray-900">Projects</a>
        <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
        <a href="/bloomberg" className="text-bloombergAccent hover:text-orange-600 font-semibold">Bloomberg Terminal</a>
        <a href="/NoamTeshuvaResume.pdf" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="text-gray-600 hover:text-gray-900 inline-flex items-center">
          <FileText className="mr-1" size={18} />
          resume
        </a>
      </div>
    </div>
  </div>
</nav>


     {/* Hero Section */}
<div className="bg-white">
  <div className="max-w-5xl mx-auto px-4 py-20">
    <div className="text-center">
{/* Profile Photo */}
<div className="relative w-40 h-40 mx-auto mb-8">
  <picture>
    <source srcSet="/profile-photo.avif" type="image/avif" />
    <source srcSet="/profile-photo.png" type="image/png" />
    <img
      src="/profile-photo.png"
      alt="Profile photo of Noam Teshuva"
      className="rounded-full w-full h-full object-cover shadow-lg"
    />
  </picture>
</div>



      {/* Name and Title */}
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{personalInfo.name}</h1>
      <p className="text-xl text-gray-600 mb-8">{personalInfo.title}</p>

      {/* Social Buttons */}
{/* Social Buttons */}
<div className="flex justify-center space-x-4">
  {/* GitHub Button */}
  <a
    href={personalInfo.github}
    target="_blank"
    rel="noopener noreferrer"
    className="p-2 text-gray-600 hover:text-gray-900"
    aria-label="GitHub Profile"
  >
    <Github size={24} />
  </a>

  {/* LinkedIn Button */}
  <a
    href={personalInfo.linkedin}
    target="_blank"
    rel="noopener noreferrer"
    className="p-2 text-gray-600 hover:text-gray-900"
    aria-label="LinkedIn Profile"
  >
    <Linkedin size={24} />
  </a>

  {/* Gmail Button */}
  <a
    href={`mailto:${personalInfo.email}`}
    target="_blank"
    rel="noopener noreferrer"
    className="p-2 text-gray-600 hover:text-red-600"
    aria-label="Email Noam Teshuva"
  >
    <Mail size={24} />
  </a>
</div>

    </div>
  </div>
</div>

      {/* Rest of the sections remain the same */}
     {/* About Section */}
<section id="about" className="py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">About Me</h2>
    <div className="space-y-4">
      <p className="text-lg text-gray-600 leading-relaxed">
        Data & ML engineer. I build end-to-end pipelines that turn messy, multi-source data into reliable, production-ready datasets and models.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Stack.</strong> Python (Pandas, NumPy, scikit-learn, Matplotlib), SQL (advanced), CatBoost; modular code with tests, logging, and docs.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Pipelines.</strong> Ingestion → validation → transformation/feature engineering → training/evaluation → deploy via lightweight services/APIs.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Quality.</strong> Schema design, data contracts, versioned transforms, and reproducible runs at scale.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Outcomes.</strong> Experienced in extracting data insights from big data and different types of data.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Background.</strong> B.Sc. in Computer Science & Mathematics; comfortable moving fast and communicating clearly with product and engineering.
      </p>
    </div>
  </div>
</section>


    {/* Projects Section */}
<section id="projects" className="bg-white py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Bloomberg Terminal - Noam Website */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-sm font-bold text-black mb-2">FINANCIAL TERMINAL</p>
        <div className="mb-4">
          <img
            src={require('./pictures/Screenshot 2025-11-16 093758.png')}
            alt="Bloomberg Terminal Interface"
            className="w-full h-32 object-cover rounded-lg shadow-sm"
          />
        </div>
        <h3 className="text-xl font-semibold mb-2">Bloomberg-Style Financial Terminal</h3>
        <p className="text-gray-600 mb-4">
          Professional financial terminal built with React, featuring real-time stock quotes, watchlists, peer analysis, and comprehensive market data visualization. Includes advanced features like EMA calculations, smart polling, and rate limit management.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/noam-website"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
        </div>
      </div>

      {/* Pedestrian Web Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-sm font-bold text-black mb-2">PEDESTRIAN WEB APP</p>
        <div className="mb-4">
          <img
            src={require('./pictures/Screenshot 2025-11-17 151917.png')}
            alt="Pedestrian Volume Prediction Web App"
            className="w-full h-32 object-cover rounded-lg shadow-sm"
          />
        </div>
        <h3 className="text-xl font-semibold mb-2">Pedestrian Volume Prediction Web Application</h3>
        <p className="text-gray-600 mb-4">
          Interactive web application for the pedestrian volume prediction project. This site provides a user-friendly interface to explore the ML models, visualize predictions, and interact with the pedestrian volume prediction system developed in the research.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/pedestrian-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
        </div>
      </div>

      {/* Deep Learning Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-sm font-bold text-black mb-2">DEEP LEARNING MODELS</p>
        <h3 className="text-xl font-semibold mb-2">Deep Learning Course Project</h3>
        <p className="text-gray-600 mb-4">
          Developed and optimized various neural network architectures, including CNNs (with MobileNetV2 and ResNet), RNNs, Multilayer Neural Networks, and Logistic Regression models. Explored different approaches to improve model performance. Focused on binary classification using PyTorch.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/DeepLearningProject/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
        </div>
      </div>

      {/* Pedestrian Volume Prediction Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-sm font-bold text-black mb-2">ML PEDESTRIAN MODEL</p>
        <h3 className="text-xl font-semibold mb-2">ML-Models-for-Pedestrian-Volume-Prediction</h3>
        <p className="text-gray-600 mb-4">
          Developed and compared multiple machine learning models to predict pedestrian volume based on real-world data. The project covers data analysis, feature extraction, model training, and evaluation. All code and results are available in the repository.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/ML-Models-for-Pedestrian-Volume-Prediction"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
        </div>
      </div>

    </div>
  </div>
</section>


      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Contact</h2>
          <div className="flex flex-col items-center space-y-6">
            <a 
              href={`mailto:${personalInfo.email}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Mail className="mr-2" size={20} />
              {personalInfo.email}
            </a>
            <a 
              href={`tel:+972${personalInfo.phone}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Phone className="mr-2" size={20} />
              {personalInfo.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} {personalInfo.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Portfolio;