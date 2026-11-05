import logoImage from '../../../assets/img/logo.png';

function Logo() {
  return (
    <>
      <img src={logoImage} alt="Fluig Monitor" />
      <div className="logoData">
        <span className="title">
          Fluig <span className="title-suffix">Monitor</span>
        </span>
      </div>
    </>
  );
}

export default Logo;
