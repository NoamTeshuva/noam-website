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
        Curious, independent thinker with a strong technical foundation (B.Sc. in Computer Science & Math) and hands-on research experience in tech and AI.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Current Research:</strong> Research Assistant at Ariel University's Civil Engineering Department, developing ML pipelines for pedestrian volume prediction using geospatial, temporal, and environmental data with CatBoost classifiers.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Technical Skills:</strong> Python (Pandas, NumPy, Scikit-learn, Matplotlib), SQL, MongoDB, GeoPandas, OSMnx, spatial data processing, and modern AI tools (Claude, GPT, Cursor).
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        <strong>Impact-Driven Work:</strong> Co-developed web tools for urban design research, integrated multi-source GIS datasets, and delivered actionable intelligence under tight deadlines. Looking to join teams that think ahead of the curve and value clarity, sharp questions, and real tech understanding.
      </p>
    </div>
  </div>
</section>


    {/* Projects Section */}
<section id="projects" className="bg-white py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Deep Learning Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
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

      {/* ML Final Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-2">ML_Final_Project</h3>
        <p className="text-gray-600 mb-4">
          Comprehensive machine learning project focused on advanced model development, feature engineering, and performance evaluation. Includes data preprocessing, model selection, and in-depth analysis using Python and popular ML libraries. See the repository for full details and code.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/ML_Final_Project"
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
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact</h2>
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