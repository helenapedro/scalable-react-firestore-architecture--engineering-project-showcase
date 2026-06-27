import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";
import "./styles/App.module.css";

import Wrapper from "./components/wrapper";
import Main from "./components/main";
import NavBar from "./pages/NavBar/NavBar";
import ProjectsContainer from "./pages/projects/ProjectContainer";
import ProjectCard from "./components/project/ProjectCard";
import Certificate from "./pages/Certificate/Certificate";
import NotFound from "./pages/NotFound";
import AboutContainer from "./pages/About/AboutContainer";
import ProjectMap from "./pages/Map/ProjectMap";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { getLanguageFromPath, isSupportedLanguage, normalizeLanguage } from "./i18n/routes";

const LanguageSync: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    const routeLanguage = isSupportedLanguage(params.lang)
      ? normalizeLanguage(params.lang)
      : getLanguageFromPath(location.pathname);

    if (i18n.language !== routeLanguage) {
      i18n.changeLanguage(routeLanguage);
    }

    document.documentElement.lang = routeLanguage;
  }, [i18n, location.pathname, params.lang]);

  return React.createElement(
    Wrapper,
    null,
    React.createElement(NavBar, null),
    React.createElement(
      Main,
      null,
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/", element: React.createElement(ProjectsContainer, null) }),
        React.createElement(Route, { path: "/projects/:id", element: React.createElement(ProjectCard, null) }),
        React.createElement(Route, { path: "/map", element: React.createElement(ProjectMap, null) }),
        React.createElement(Route, { path: "/admin", element: React.createElement(AdminDashboard, null) }),
        React.createElement(Route, { path: "/education", element: React.createElement(Certificate, null) }),
        React.createElement(Route, { path: "/about", element: React.createElement(AboutContainer, null) }),
        React.createElement(Route, { path: "/:lang", element: React.createElement(ProjectsContainer, null) }),
        React.createElement(Route, { path: "/:lang/projetos/:id", element: React.createElement(ProjectCard, null) }),
        React.createElement(Route, { path: "/:lang/projects/:id", element: React.createElement(ProjectCard, null) }),
        React.createElement(Route, { path: "/:lang/mapa", element: React.createElement(ProjectMap, null) }),
        React.createElement(Route, { path: "/:lang/map", element: React.createElement(ProjectMap, null) }),
        React.createElement(Route, { path: "/:lang/admin", element: React.createElement(AdminDashboard, null) }),
        React.createElement(Route, { path: "/:lang/formacao", element: React.createElement(Certificate, null) }),
        React.createElement(Route, { path: "/:lang/education", element: React.createElement(Certificate, null) }),
        React.createElement(Route, { path: "/:lang/sobre", element: React.createElement(AboutContainer, null) }),
        React.createElement(Route, { path: "/:lang/about", element: React.createElement(AboutContainer, null) }),
        React.createElement(Route, { path: "*", element: React.createElement(NotFound, null) })
      )
    )
  );
};

const App: React.FC = () => {
  const basename = process.env.PUBLIC_URL || undefined;

  return React.createElement(
    Router,
    {
      basename,
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      },
    },
    React.createElement(LanguageSync, null)
  );
};

export default App;
